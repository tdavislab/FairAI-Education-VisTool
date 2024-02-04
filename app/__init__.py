from flask import Flask
from flask_session import Session
import os

APP_ROOT = os.path.dirname(os.path.abspath(__file__))
APP_STATIC = os.path.join(APP_ROOT, 'static')
UPLOAD_FOLDER = os.path.join(APP_STATIC,'uploads')
ALLOWED_EXTENSIONS = {'txt', 'csv'}

app = Flask(__name__)

app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
app.config['DEBUG'] = True  
app.config['ASSETS_DEBUG'] = True
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

Session(app)

from .util import assets
from app import views