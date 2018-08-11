from flask import Flask, render_template, make_response

app = Flask(__name__)
from app import views
