from app import app
from flask import render_template, make_response, request
import xmltodict
import requests
import json
from sklearn.externals import joblib

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import sklearn as sk
from sklearn.ensemble import RandomForestRegressor
from sklearn import preprocessing
from sklearn.model_selection import train_test_split


# convert method parses XML response from Zillow API by reading temp XML file and returning as Dictionary
def convert(xml_file, xml_attribs=True):
    with open(xml_file, "rb") as f:    # notice the "rb" mode
        d = xmltodict.parse(f, xml_attribs=xml_attribs)
    return d


# collectCompData performs GET requests to Zillow API on all consecutive comparable homes, outputing list of Home
# Dictionaries run through the convert method above
def collectCompData(zpid, state):
    dataList = []
    address = ('http://www.zillow.com/webservice/GetDeepComps.htm?zws-id=X1-ZWz1fzfk5v8vm3_2qbsp&zpid='
               + zpid + '&count=5')
    r = requests.get(address)
    with open('compsFile.xml', 'w') as fb:
        fb.write(r.text)
    response = convert('compsFile.xml')
    response = response['Comps:comps']['response']['properties']['comparables']['comp']
    for house in response:
        dataList.append(createDataDict(house, house['address']['state']))
    return {'data': dataList, 'res': response}


# returnHeatValue returns list based on State location of search result and comparables
def returnHeatValue(state):
    heatValues = {'AL': [3603, 1547], 'AR': [2286, 2440], 'AZ': [5209, 1243], 'CA': [3226, 704], 'CO': [5209, 1243],
                  'CT': [6612, 417], 'DC': [2853, 1964], 'DE': [2853, 1964], 'FL': [2853, 1964], 'GA': [2853, 1964],
                  'IA': [6750, 927], 'ID': [5209, 1243], 'IL': [6498, 709], 'IN': [6498, 709], 'KS': [6750, 927],
                  'KY': [3603, 1547], 'LA': [2286, 2440], 'MA': [6612, 417], 'MD': [2853, 1964],
                  'ME': [6612, 417], 'MI': [6498, 709], 'MN': [6750, 927], 'MO': [6750, 927], 'MS': [3603, 1547],
                  'MT': [5209, 1243], 'NC': [2853, 1964], 'ND': [6750, 927], 'NE': [6750, 927],
                  'NH': [6612, 417], 'NJ': [5910, 656], 'NM': [5209, 1243], 'NV': [5209, 1243],
                  'NY': [5910, 656], 'OH': [6498, 709], 'OK': [2286, 2440], 'OR': [3226, 704],
                  'PA': [5910, 656], 'RI': [6612, 417], 'SC': [2853, 1964], 'SD': [6750, 927],
                  'TN': [3603, 1547], 'TX': [2286, 2440], 'UT': [5209, 1243], 'VA': [2853, 1964],
                  'VT': [6612, 417], 'WA': [3226, 704], 'WI': [6498, 709], 'WV': [2853, 1964], 'WY': [5209, 1243]}
    return heatValues[state]


def imputeMissing(dict):
    if dict['YEARMADE'] == 'None':
        dict['YEARMADE'] = 1971
    if dict['BEDROOMS'] == 'None':
        dict['BEDROOMS'] = 2.86
    if dict['NCOMBATH'] == 'None':
        dict['NCOMBATH'] = 1.67
    if dict['TOTSQFT'] == 'None':
        dict['TOTSQFT'] = 2172.35
    return dict


# createDataDict builds Dictionary of necessary items to run through data model
def createDataDict(res, state):
    heatAndCoolDays = returnHeatValue(state)
    originalSearch = {'HDD65': heatAndCoolDays[1], 'CDD65': heatAndCoolDays[0],
                      'YEARMADE': int(res.get('yearBuilt')), 'BEDROOMS': int(res['bedrooms']),
                      'NCOMBATH': float(res['bathrooms']), 'TOTSQFT': int(res['finishedSqFt'])}
    originalSearch = imputeMissing(originalSearch)
    return originalSearch


# runDataModel creates a Data Frame through Pandas package and runs model
def runDataModel(data):
    model = joblib.load('gradient_boosted_tree_model.pkl')
    prediction = model.predict(data)
    # divide by 12 to get a monthly $ amount (this is the value to display on web app for each house)
    monthly_bill = prediction
    # divide by sqft to get a bill / sqft $ amount (this is the second value to display on web app for each house)
    # monthly_bill_sqft = monthly_bill/sqft
    return {'bill': monthly_bill}


@app.route('/')
@app.route('/index', methods=["POST", "GET"])
def index():
    return render_template('index.html')


# queryZillow endpoint is accessed through submit request when form is completed and App.js file performs AJAX
# request with address information
@app.route('/queryZillow', methods=['POST', 'GET'])
def queryZillow():
    newData = request.get_json()
    street = newData['street']
    city = newData['city']
    state = newData['state']
    address = ('http://www.zillow.com/webservice/GetDeepSearchResults.htm?zws-id=X1-ZWz1fzfk5v8vm3_2qbsp&address='
               + street + '&citystatezip=' + city + state)
    # initial call to Zillow API for first home
    r = requests.get(address)
    with open('file.xml', 'w') as fb:
        fb.write(r.text)
    response = convert('file.xml')
    response = response['SearchResults:searchresults']['response']['results']['result']
    # initial API call data result variable
    data = createDataDict(response, state)
    # initial search zpid for use with comp homes
    originalZpId = response['zpid']
    # call to collectCompData to collect additional comparable home data
    dataList = collectCompData(originalZpId, state)
    count = 0
    col = ["HDD65", "CDD65", "YEARMADE", "BEDROOMS", "NCOMBATH", "TOTSQFT"]
    homeDataFrame = pd.DataFrame(data, index=[count], columns=col)
    # loops over comparable home data and adds to data frame
    for house in dataList['data']:
        count = count + 1
        nextHome = pd.DataFrame(house, index=[count], columns=col)
        homeDataFrame = homeDataFrame.append(nextHome)
    result = runDataModel(homeDataFrame)
    # creates JSONified finale data to send back to client for rendering to view
    finalResult = pd.Series(result).to_json(orient='values')
    dataList['data'].insert(0, data)
    dataList['res'].insert(0, response)
    return json.dumps({'result': finalResult, 'dataList': dataList})
