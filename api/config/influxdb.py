from dotenv import load_dotenv
import os

load_dotenv()

INFLUXDB_HOST = os.getenv('INFLUXDB_HOST', 'http://localhost:8086')
INFLUXDB_TOKEN = os.getenv('INFLUXDB_TOKEN')
INFLUXDB_ORG = os.getenv('INFLUXDB_ORG')
INFLUXDB_BUCKET_PREFIX = os.getenv('INFLUXDB_BUCKET_PREFIX', 'hcgateway')

def get_influxdb_config():
    return {
        'host': INFLUXDB_HOST,
        'token': INFLUXDB_TOKEN,
        'org': INFLUXDB_ORG,
        'bucket_prefix': INFLUXDB_BUCKET_PREFIX
    }
