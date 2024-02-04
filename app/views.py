from flask import render_template
from flask import jsonify, request
from flask import session
from app import app
from app import APP_STATIC
from .fairAI import fairAI
from .processConfig import ProcessConfig
from .LogisticRegressionC1 import LRChapter1
from .LRExplainer import lrExplainer
from os import path

@app.route('/')
def index():
    # clear session
    for key in list(session.keys()):
        session.pop(key)
    session['count'] = 0
    session['LRChapter1Obj'] = ''
    session['LREObj'] = ''
    session['fairAIObj'] = fairAI(path.join(APP_STATIC,"uploads/data/creditScore.csv"))
    session['configs'] = ProcessConfig()
    return render_template('index.html')

###################################Initiation#################################
# when first load the website, init the homepage, return all titles of these chapter and the first page
@app.route('/init', methods=['POST'])
def initInterface():
    session['fairAIObj'] = fairAI(path.join(APP_STATIC,"uploads/data/creditScore.csv"))
    res = {}
    res['titles'] = session['configs'].chapter_title_lst
    res['firstChapter'] = session['configs'].get_chapter(1)
    return jsonify(res)

# get the json file of this chapter
@app.route('/getChapter', methods=['POST'])
def getChapter():
    paras = request.get_json()
    chapter_id = paras['id']
    if chapter_id == 1:
        session['fairAIObj'] = fairAI(path.join(APP_STATIC,"uploads/data/creditScore.csv"))
    return jsonify(session['configs'].get_chapter(chapter_id))

###################################Render Table#################################
# return 200 rows of the raw data for rendering the table
@app.route('/getTabelData', methods=['POST'])
def getTabelData():
    return session['fairAIObj'].get_table_data()


###################################Component C1: Logistic Regression#################################
# get the train and test data (C1)
@app.route('/getLREData', methods=['POST'])
def getLREData():
    session['LREObj'] = lrExplainer()
    res = {'train': session['LREObj'].train_dict_lst, 'test': session['LREObj'].test_dict_lst}
    return jsonify(res)

# train data and the get the coes of LR (C1)
@app.route('/trainLREData', methods=['POST'])
def trainLREData():
    paras = request.get_json()
    train_data = paras['data']
    res = session['LREObj'].train_model(train_data)
    return jsonify(res)

# test model and the get the prediction (C1)
@app.route('/testLREData', methods=['POST'])
def testLREData():
    paras = request.get_json()
    test_data = paras['data']
    res = session['LREObj'].test_model(test_data)
    return jsonify(res)

###################################Component C2: Customization#################################
# return the basic information of the data set
@app.route('/getDataInfo', methods=['POST'])
def getRawDataOInfo():
    return session['fairAIObj'].get_data_info()

# generate the train and test data based on the form information
# e.g., {'number': 0.5, 'features': ['employment', 'dependents', 'age'], 'sensitiveAttr': 'gender', 'ratio': 0.5}
@app.route('/getTrainTest', methods=['POST', 'GET'])
def getTrainTest():
    paras = request.get_json()
    # new a object
    session['LRChapter1Obj'] = LRChapter1()
    session['LRChapter1Obj'].split(split_ratio=paras['ratio'], keep_features = paras['features'])
    return jsonify(session['LRChapter1Obj'].get_input_data_info())

###################################Component C3: Train&TestModel#################################
# train the  model and get the train result of this data
@app.route('/trainModel', methods=['POST'])
def trainModel():
    paras = request.get_json()
    session['fairAIObj'].train_model(paras['modelName'], paras['trainName'])
    return jsonify({'a': 'b'})

# test the  model and get the test result of this data
@app.route('/testModel', methods=['POST'])
def testModel():
    paras = request.get_json()
    print("test info", paras)
    res = session['fairAIObj'].test(paras['metricName'], paras['model'])
    return jsonify(res)

# train the model in the chapter 1
@app.route('/trainModelC1', methods=['POST'])
def trainModelC1():
    res = session['LRChapter1Obj'].train_model()
    return jsonify(res)

# test the  model and get the test result of this datain the chapter1
@app.route('/testModelC1', methods=['POST'])
def testModelC1():
    res = session['LRChapter1Obj'].test_model()
    return jsonify(res)

# get the baseline of accuracy and confusion matrix 
# used in debiasing component
@app.route('/getBaseAccCF', methods=['POST'])
def getBaseAccCF():
    if not session['fairAIObj']:
        session['fairAIObj'] = fairAI(path.join(APP_STATIC,"uploads/data/creditScore.csv"))
        session['fairAIObj'].init()
    session['fairAIObj'].train_model()
    cf_data = session['fairAIObj'].test('Original', 'LR')['data']  # evaluate the model with the test data
    metrics = session['fairAIObj'].get_test_fair_metrics('Original')
    metrics['CF'] = cf_data
    metrics['accuracy'] = session['fairAIObj'].test_accuracies['Original']
    return metrics

# when open the debias chapter, then new a fairObj and get the baseline
@app.route('/startDebias', methods=['POST'])
def startDebias():
    session['fairAIObj'] = fairAI(path.join(APP_STATIC,"uploads/data/creditScore.csv"))
    session['fairAIObj'].init()
    session['fairAIObj'].train_model()   # train the Logistic Regression model
    test_res = session['fairAIObj'].test('Original', 'LR')  # evaluate the model with the test data
    res = session['fairAIObj'].get_input_data_info()
    res['output'] = test_res['data']
    return jsonify(res)

###################################Component C4: Fairness metrics#################################
# get the metric values of four fairness metrics
# {'type': 'Original'/'Reweighing'/'LFR'/'OptimPreproc'; 'inSet': -1(not in VSSet), otherwise, >-1}
# return: if a single fairness metrics: {'SPD': [{'Original': 07}, {} ....], 'DI': [], 'EOD': [], 'AOD': [], 'CF': [[], []]}
@app.route('/getMetrics', methods=['POST'])
def getMetrics():
    paras = request.get_json()
    type = paras['type']
    inSet = paras['inSet']
    if type == 'Original' and inSet == -1: # use this one when show single fairness metric component
        session['fairAIObj'] = fairAI(path.join(APP_STATIC,"uploads/data/creditScore.csv"))
        session['fairAIObj'].init()
        session['fairAIObj'].train_model()
        pred = session['fairAIObj'].test('Original', 'LR')  ## evaluate the model with the test data
        cf_data = pred['data']  #confusion matrix 
        metrics = session['fairAIObj'].get_test_fair_metrics('Original')
        metrics['CF'] = cf_data
        metrics['accuracy'] = pred['accuracy']
        return metrics
    return jsonify(session['fairAIObj'].get_test_fair_metrics(type))


###################################Component C5: Preprocessing#################################
# get the train data after preprocessing according to type
# {'type': 'Reweighing'/'LFR'/'OptimPreproc'}
@app.route('/getPreprocessData', methods=['GET', 'POST'])
def getPreprocData():
    paras = request.get_json()
    type = paras['type']
    print('getPreprocessData', paras)
    return jsonify(session['fairAIObj'].preProcess(type))


###################################Component C6: Postprocessing#################################
# get the train data after preprocessing according to type
# {'type': 'Reweighing'/'LFR'/'OptimPreproc'}
@app.route('/getPostprocessData', methods=['GET', 'POST'])
def getPostprocessData():
    return jsonify(session['fairAIObj'].ROC())

# return the bar chart data
# {'attribute': 'gender', 'type': 'train'}
@app.route('/attrDtb', methods=['POST'])
def getAttrDtb():
    paras = request.get_json()
    attribute = paras['attribute']
    data_type = paras['type']
    res = session['fairAIObj'].get_attr_dtb_data(attribute, data_type)   # {data: [{v: , l: }], attribute: 'gender', continuous: true/false}
    return jsonify(res)

# get the accuacy
# {'type': 'Original'/'Reweighing'/'LFR'/'OptimPreproc'/..}
@app.route('/getAccuracy', methods=['POST'])
def getAccuracy():
    paras = request.get_json()
    type = paras['type']
    return jsonify(session['fairAIObj'].get_accuracies(type))
    
@app.route('/getReweighingWeights', methods=['POST'])
def getReweighingWeights():
    return jsonify(session['fairAIObj'].reweighing())

