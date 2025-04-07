from flask import Flask
from flask_cors import CORS
import os
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
CORS(app)

from apiVersions.v2 import init_app as init_v2
init_v2(app)

app.run(host=os.environ.get('APP_HOST', '0.0.0.0'), port=int(os.environ.get('APP_PORT', 6644)), debug=bool(os.environ.get('APP_DEBUG', False)))
