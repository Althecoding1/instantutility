#!flask/bin/python3
from app import app
app.run(host='0.0.0.0', port=5007)
app.run(debug=True)
