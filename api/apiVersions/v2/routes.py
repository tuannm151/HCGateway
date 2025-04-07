import influxdb_client, os, json, time
from flask import Blueprint, request, jsonify, g
from dotenv import load_dotenv
from utils.metrics_transformer import transform_batch_metrics
load_dotenv()

from config.database import find_user_by_token, find_user_by_username, find_user_by_refresh, find_user_by_id, create_user, update_user_tokens

from argon2 import PasswordHasher

import datetime

from config.influxdb import get_influxdb_config
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS
from utils.metrics_transformer import transform_health_metrics

v2 = Blueprint('v2', __name__, url_prefix='/api/v2/')

ph = PasswordHasher()

@v2.before_request
def before_request():
    if request.endpoint == 'v2.login' or request.endpoint == 'v2.refresh':
        return
    
    if not request.headers.get('Authorization'):
        return jsonify({'error': 'no token provided'}), 400

    token = request.headers.get('Authorization').split(' ')[1]
    
    user = find_user_by_token(token)

    if not user:
        return jsonify({'error': 'invalid token'}), 403
    
    expiry = datetime.datetime.fromisoformat(user['expiry'])
    if datetime.datetime.now() > expiry:
        return jsonify({'error': 'token expired. Use /api/v2/login to reauthenticate.'}), 403
    
    g.user_id = user['id']
    g.user_name = user['username']

    return

@v2.route("/login", methods=['POST'])
def login(): 
    if not request.json or not 'username' in request.json or not 'password' in request.json:
        return jsonify({'error': 'invalid request'}), 400
    username = request.json['username']
    password = request.json['password']

    user = find_user_by_username(username)

    if not user:
        # Create new user with SQLite
        new_user = create_user(username, password)
        
        return jsonify({
            "token": new_user['token'],
            "refresh": new_user['refresh'],
            "expiry": new_user['expiry']
        }), 201
    
    try:
        ph.verify(user['password'], password)
    except: 
        return jsonify({'error': 'invalid password'}), 403
   
    user_id = user['id']

    expiry = datetime.datetime.fromisoformat(user['expiry']) if 'expiry' in user else None
    if not expiry or datetime.datetime.now() > expiry:
        # Update tokens
        token_data = update_user_tokens(user_id)
        token = token_data['token']
        refresh = token_data['refresh']
        expiry_str = token_data['expiry']
    else:
        token = user['token']
        refresh = user['refresh']
        expiry_str = user['expiry']

    return jsonify({
            "token": token,
            "refresh": refresh,
            "expiry": expiry_str
    }), 201

@v2.route("/refresh", methods=['POST'])
def refresh():
    if not request.json or not 'refresh' in request.json:
        return jsonify({'error': 'invalid request'}), 400

    refresh_token = request.json['refresh']

    user = find_user_by_refresh(refresh_token)

    if not user:
        return jsonify({'error': 'invalid refresh token'}), 403
    
    # Update tokens
    token_data = update_user_tokens(user['id'])

    return jsonify({
            "token": token_data['token'],
            "refresh": token_data['refresh'],
            "expiry": token_data['expiry']
    }), 200

@v2.post("/sync/<method>")
def sync(method):
    method = method[0].lower() + method[1:]
    if not method:
        return jsonify({'error': 'no method provided'}), 400
    if not "data" in request.json:
        return jsonify({'error': 'no data provided'}), 400
    
    userid = g.user_id

    data = request.json['data']
    if type(data) != list:
        data = [data]
    
    # InfluxDB sync - using only InfluxDB for data storage
    influx_config = get_influxdb_config()

    client = influxdb_client.InfluxDBClient(
        url=influx_config['host'],
        token=influx_config['token'],
        org=influx_config['org']
    )

    write_api = client.write_api(write_options=SYNCHRONOUS)
    bucket_api = client.buckets_api()

    userBucket = f"{influx_config['bucket_prefix']}_{userid}_{g.user_name}"
    try:
        bucket = bucket_api.find_bucket_by_name(userBucket)
        if not bucket:
            raise Exception("Bucket not found")
    except:
        bucket_api.create_bucket(bucket_name=userBucket, org=influx_config['org'])
        
    for item in data:
        itemid = item['metadata']['id']
        dataObj = {}
        for k, v in item.items():
            if k != "metadata" and k != "time" and k != "startTime" and k != "endTime":
                dataObj[k] = v

        if "time" in item:
            starttime = item['time']
            endtime = None
        else:
            starttime = item['startTime']
            endtime = item['endTime']
        
        # Store all fields directly for querying
        # Transform numeric fields into metrics
        transformed_data = transform_health_metrics(dataObj)
        points = []
        for k, v in transformed_data.items():
            point = Point(method)
            point.time(endtime if endtime else starttime if starttime else datetime.datetime.now())
            point.tag("user_id", userid)
            point.tag("user_name", g.user_name)
            point.tag("app", item['metadata']['dataOrigin'])
            point.tag("item_id", itemid)
            point.field(k, float(v))
            points.append(point)
        write_api.write(bucket=userBucket, org=influx_config['org'], record=points)

    return jsonify({'success': True}), 200

@v2.route("/fetch/<method>", methods=['POST'])
def fetch(method):
    if not method:
        return jsonify({'error': 'no method provided'}), 400

    userid = g.user_id
    
    # Get query parameters
    if not "queries" in request.json:
        queries = {}
    else:
        queries = request.json['queries']
    
    # Get InfluxDB configuration
    influx_config = get_influxdb_config(userid)
    
    # Connect to InfluxDB
    client = InfluxDBClient3(
        host=influx_config['host'],
        token=influx_config['token'],
        org=influx_config['org']
    )
    
    # Build query parameters
    query_params = [f"_measurement = '{method}'"]
    query_params.append(f"user_id = '{userid}'")
    
    # Add additional query parameters if provided
    for key, value in queries.items():
        if key == 'app' and value:
            query_params.append(f"app = '{value}'")
        if key == 'item_id' and value:
            query_params.append(f"item_id = '{value}'")
        if key == 'start_time' and value:
            query_params.append(f"_time >= '{value}'")
        if key == 'end_time' and value:
            query_params.append(f"_time <= '{value}'")
    
    # Build and execute query
    query = f"SELECT * FROM {influx_config['bucket']} WHERE {' AND '.join(query_params)}"
    tables = client.query(query=query)
    
    # Process results
    docs = []
    for table in tables:
        for record in table.records:
            # Extract data
            item = {
                'id': record.values.get('item_id'),
                'app': record.values.get('app'),
                'time': record.values.get('_time').isoformat()
            }
            
            # Add all fields to data
            item['data'] = {}
            for key, value in record.values.items():
                if key not in ['_measurement', '_time', 'user_id', 'app', 'item_id']:
                    item['data'][key] = value
            
            docs.append(item)

    return jsonify(docs), 200


@v2.route("/push/<method>", methods=['POST'])
def push_data(method):
    if not method:
        return jsonify({'error': 'no method provided'}), 400
    if not "data" in request.json:
        return jsonify({'error': 'no data provided'}), 400

    userid = g.user_id
    data = request.json['data']
    if type(data) != list:
        data = [data]

    fixedMethodName = method[0].upper() + method[1:]
    for r in data:
        r['recordType'] = fixedMethodName
        if "time" not in r and ("startTime" not in r or "endTime" not in r):
            return jsonify({'error': 'no start time or end time provided. If only one time is to be used, then use the "time" attribute instead.'}), 400
        if ("startTime" in r and "endTime" not in r) or ("startTime" not in r and "endTime" in r):
            return jsonify({'error': 'start time and end time must be provided together.'}), 400

    # Get user from SQLite
    user = find_user_by_id(userid)
    if not user:
        return jsonify({'error': 'invalid user id'}), 400

    return jsonify({'success': True, "message": "request has been sent to device."}), 200
