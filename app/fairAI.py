import sys
from app import APP_STATIC
from os import path
sys.path.insert(1, "../")  
import numpy as np
np.random.seed(0)
import pandas as pd
from aif360.datasets import BinaryLabelDataset
from aif360.metrics import BinaryLabelDatasetMetric
from aif360.metrics import ClassificationMetric
from aif360.algorithms.preprocessing import Reweighing
from aif360.algorithms.preprocessing import LFR
from aif360.algorithms.inprocessing.adversarial_debiasing import AdversarialDebiasing
from .optim_preproc_helpers.optim_preproc import OptimPreproc
from .optim_preproc_helpers.opt_tools import OptTools
from .optim_preproc_helpers.prejudice_remover import PrejudiceRemover
from aif360.datasets import BankDataset
from aif360.algorithms.postprocessing import RejectOptionClassification
import tensorflow.compat.v1 as tf
tf.disable_eager_execution()
from sklearn.linear_model import LogisticRegression
from .utils import load_preproc_data, get_distortion
import copy
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'


class fairAI:
    """
    Functionalities:
        1. Train and evaluate model 
        2. Fairness metrics
        3. pre/in/post-processsing
    """
    def __init__(self, data_path):
        """
        Arg:
            data_path (str): the path of the source data
        """
        self.df = pd.read_csv(data_path, sep=',')    # raw dataset

        self.dataset_orig = ''          # (BinaryLabelDataset) original dataset
        self.dataset_orig_train = ''    # train part of original dataset
        self.dataset_orig_test = ''     # test part of original dataset
        self.dataset_orig_pred = ''     # original prediction
        self.split_ratio = ''

        self.privileged_groups = ''     # [{'gender': 1}]
        self.unprivileged_groups = ''

        self.metric_orig_train = ''
        self.metric_orig_test = ''

        self.miti_train_lst = {}        # {'Reweighing':  train, ... }     value is the data
        self.metric_miti_train_lst = {}     # {'Reweighing': , .. } value is the metric object
        self.test_fair_metrics = {'SPD': {}, 'DI': {}, 'EOD': {}, 'AOD': {}}    # 'SPD': {'Original': 0.95, 'Reweighing': 0.2, ...}
        self.test_accuracies = {}   #{'Reweighing': 0.89, 'Original': 0.6}
        self.model = ''     # the trained model
        self.is_debias_model = False    # the ML model in-processing debias model or not
        # current model_name and the train_name
        self.model_name = ''
        self.train_name = '' 
    
    def get_table_data(self):
        """render table data into a tabel on a web page
        returns:
            {"columns": ['f1', 'f2', ...], "data": [[], [], []...]}
        """
        dataset = self.df.copy()
        rowData = dataset.values.tolist()
        if len(rowData) > 200:
            rowData = rowData[:200]
        features = dataset.columns.values.tolist()
        table_data = {'columns': features, 'data': rowData}
        return table_data

    def get_data_info(self):
        """get the information of the entire dataset for rendering C2
            returns:
                {'raw_data_num': , 'raw_data_features': []}
        """
        feature_lst = self.df.columns.values.tolist()
        try:
            feature_lst.remove('response')
        except:
            print('no such feature')

        return {
            'raw_data_num': self.df.shape[0],
            'raw_data_features': feature_lst
        }

    def init(self, 
             split_ratio=0.68,  
             protected_attribute_names=['gender']):
        """init the dataset object, split the data into train data and test data 
        (initialize dataset_orig_train dataset_orig_test dataset_orig)
        Args: 
            split_ratio (num: 0-1): the percentage of the train data
            protected_attribute_names (list): protected attributes, by default, gender
        """
        self.split_ratio = split_ratio
        df_copy = copy.deepcopy(self.df)

        self.dataset_orig = BinaryLabelDataset(
            df=df_copy,
            label_names=['response'],        
            favorable_label=1,          # response = 1 positive; 
            unfavorable_label=0,        # response = 0 negative;
            protected_attribute_names=protected_attribute_names  
        )
        self.privileged_groups = [{'gender': 1}]
        self.unprivileged_groups = [{'gender': 0}]
        self.dataset_orig_train, self.dataset_orig_test = self.dataset_orig.split([split_ratio], shuffle=None)
        
        self.metric_orig_train = BinaryLabelDatasetMetric(self.dataset_orig_train, 
                                             unprivileged_groups=self.unprivileged_groups,
                                             privileged_groups=self.privileged_groups)
        self.metric_orig_test = BinaryLabelDatasetMetric(self.dataset_orig_test, 
                                             unprivileged_groups=self.unprivileged_groups,
                                             privileged_groups=self.privileged_groups)

    def train_model(self, model_name="LR", train_name="Original"):
        """train the a model according to the model name using the specified train_data
        Args:
            model_name (str): 'LR': Logistic Regression; 'PrejudiceRmv': Prejudice Remover; 'Adversarial': Adversarial Debiasing
            train_name (str): 'Original' (the original training data), 'Reweighing'; 'LFR'; 'OptimPreproc'
        """
        self.model_name = model_name
        self.train_name = train_name
        train_data = self.dataset_orig_train if train_name == 'Original' else self.miti_train_lst[train_name]
        self.is_debias_model = model_name != 'LR'
        
        if model_name == 'LR':
            self.model = LogisticRegression(random_state=0)
            if train_name == 'Reweighing':
                fit_params = {'sample_weight': train_data.instance_weights}
                self.model.fit(train_data.features, train_data.labels.ravel(), **fit_params)
            else:
                self.model.fit(train_data.features, train_data.labels.ravel())
        elif model_name == 'Adversarial':
            # adjust the parameters under different cases
            sess = tf.Session()
            num_epochs = 200
            classifier_num_hidden_units = 80
            if train_name == 'LFR':
                num_epochs = 30
                classifier_num_hidden_units = 100
            self.model = AdversarialDebiasing(privileged_groups = self.privileged_groups,
                                unprivileged_groups = self.unprivileged_groups,
                                scope_name='debiased_classifier',
                                debias=True,
                                sess=sess,
                                classifier_num_hidden_units=classifier_num_hidden_units,
                                num_epochs=num_epochs,
                                seed=0)
            self.model.fit(train_data)
            tf.reset_default_graph()
            # if this is Adversarial debiasing, then store the test result first, because the big size
            self.AdversarialTest = self.test(model_name, model_name, req_from_inner=True)
            self.model = ''
        elif model_name == 'PrejudiceRmv':
            self.model = PrejudiceRemover(eta=0.1)
            self.model.fit(train_data)
        return 

    def test(self, metric_name='', model_name = '', req_from_inner = False):
        """test/predict on the trained model (we always use the latest model)
            Args:
                metric_name(str): 'Original', 'Reweighing', 'LFR' ... 'Adversarial' ..''. the name for the fairness metrics, if name is null, don't compute the fairness metrics
                model_name(str): the name of model
            Returns:
            {
                'data': [ [[true_positive, False_positive], [False_negative, true_negative]],
                [[true_positive, False_positive], [False_negative, true_negative]] ],  # confusion matrix for the two groups
                'accuracy': 0.98,
                'attrVs': ['Male', 'Female']  # sensitive value
            }
        """
        data_info = {}
        test_data = self.dataset_optimPreproc_test if metric_name=='OptimPreproc' else self.dataset_orig_test
        # test_data = self.dataset_orig_test
        dataset_pred = ''
        # Adversarial  [has been stored previously]
        if (not req_from_inner) and model_name == 'Adversarial':
            return self.AdversarialTest
        
        if self.is_debias_model:
            dataset_pred = self.model.predict(test_data)
        else:
            y_val_pred = self.model.predict(test_data.features)
            dataset_pred = test_data.copy()
            dataset_pred.labels = np.transpose([y_val_pred])
            if metric_name == 'Original':
                scores = np.transpose([self.model.predict_proba(test_data.features)[:,1]])
                dataset_pred.scores = scores
                self.dataset_orig_pred = dataset_pred

        metric = ClassificationMetric(    
                    test_data, dataset_pred,
                    unprivileged_groups=self.unprivileged_groups,
                    privileged_groups=self.privileged_groups)
        p_confuison_matrix = metric.binary_confusion_matrix(True)
        np_confuison_matrix = metric.binary_confusion_matrix(False)

        data_info['data'] = [[[p_confuison_matrix['TP'], p_confuison_matrix['FN']], [p_confuison_matrix['FP'], p_confuison_matrix['TN']]], 
                            [[np_confuison_matrix['TP'], np_confuison_matrix['FN']], [np_confuison_matrix['FP'], np_confuison_matrix['TN']]]]
        accuracy = round(metric.accuracy(), 2)
        data_info['accuracy'] = accuracy
        data_info['attrVs'] = ['Male', 'Female']

        # save the fairness metrics
        SPD = round(metric.statistical_parity_difference(), 2)
        DI = round(metric.disparate_impact(), 2)
        EOD = round(metric.equal_opportunity_difference(), 2)
        AOD = round(metric.average_odds_difference(), 2)
        SPD = 100 if pd.isna(float(SPD)) else SPD
        DI = 100 if pd.isna(float(DI)) else DI
        EOD = 100 if pd.isna(float(EOD)) else EOD
        AOD = 100 if pd.isna(float(AOD)) else AOD
        self.test_fair_metrics['SPD'][metric_name] = SPD
        self.test_fair_metrics['DI'][metric_name] = DI
        self.test_fair_metrics['EOD'][metric_name] = EOD
        self.test_fair_metrics['AOD'][metric_name] = AOD
        self.test_accuracies[metric_name] = accuracy

        return data_info
    
    def get_input_data_info(self):
        """get the information of the input data (train and test)
        for rendering the train & test panel
        returns:
            {'train': [[male_positive, male_negative], [female_positive, female_negative]], # number
            'test': [[male_positive, male_negative], [female_positive, female_negative]], # number      
            'attrVs': ['Male', 'Female']  # sensitive value }
        """
        def get_info(metric_data):
            return [[metric_data.num_positives(True), metric_data.num_negatives(True)], 
                    [metric_data.num_positives(False), metric_data.num_negatives(False)]]
        info = {}
        info['train'] = get_info(self.metric_orig_train)
        info['test'] = get_info(self.metric_orig_test)
        info['attrVs'] = ['Male', 'Female']
        return info
    
    def get_test_fair_metrics(self, type):
        """get the fair metric values
        used in debiasing fairness metric evaluation
        Args:
            'type': 'Original'/'Reweighing'/'LFR'/'OptimPreproc'
        Returns:
            {'SPD': [{'Original': 07}, {} ....], 'DI': [], 'EOD': [], 'AOD': []} 
            if this is the bank dataset
            [{'trainName': , 'modelName': , 'SPD': , 'DI': , 'EOD':, 'AOD':}, ...]
        """ 
        fair_metrics = {'SPD': [], 'DI': [], 'EOD': [], 'AOD': []} 

        fair_metrics['SPD'].append({'Original': self.test_fair_metrics['SPD']['Original']})
        fair_metrics['DI'].append({'Original': self.test_fair_metrics['DI']['Original']})
        fair_metrics['EOD'].append({'Original': self.test_fair_metrics['EOD']['Original']})
        fair_metrics['AOD'].append({'Original': self.test_fair_metrics['AOD']['Original']})
        if type != 'Original':  # return both original and after debiasing
            fair_metrics['SPD'].append({type: self.test_fair_metrics['SPD'][type]})
            fair_metrics['DI'].append({type: self.test_fair_metrics['DI'][type]})
            fair_metrics['EOD'].append({type: self.test_fair_metrics['EOD'][type]})
            fair_metrics['AOD'].append({type: self.test_fair_metrics['AOD'][type]})
        return fair_metrics
    
    def get_accuracies(self, type):
        """get the accuracies for the prediction data
        Args:
            'type': 'Original'/'Reweighing'/'LFR'/'OptimPreproc'
        Returns:
           [{'Original': 07}, {}]
           if this is the bank dataset
            [{'trainName': , 'modelName': , 'acc': }, ...]
        """
        accuracies = []
        if 'Original' in self.test_accuracies:
            accuracies.append({'Original': self.test_accuracies['Original']})
        if type != 'Original':
            if type in self.test_accuracies:
                accuracies.append({type: self.test_accuracies[type]})
        return accuracies 
    
    def reweighing(self):
        """reweigh the original train data
        
            returns:
                (weights) [[male_p, male_n], [female_p, female_n]]
        """
        dataset_RW_train = ''
        RW = Reweighing(unprivileged_groups=self.unprivileged_groups,
                privileged_groups=self.privileged_groups)
        dataset_RW_train = RW.fit_transform(self.dataset_orig_train)

        metric_RW_train = BinaryLabelDatasetMetric(dataset_RW_train, 
                                             unprivileged_groups=self.unprivileged_groups,
                                             privileged_groups=self.privileged_groups)

        self.miti_train_lst['Reweighing'] = dataset_RW_train
        self.metric_miti_train_lst['Reweighing'] = metric_RW_train
        return [[round(RW.w_p_fav, 2), round(RW.w_p_unfav, 2)], [round(RW.w_up_fav, 2), round(RW.w_up_unfav, 2)]]
    
    def LFR(self):
        """preprocess the train data
            Returns:
                num [[male_p, male_n], [female_p, female_n]]
        """
        flag = True
        dataset_LFR_train = ''
        metric_LFR_train = ''
        LFR_model = ''
        while flag:
            LFR_model = LFR(unprivileged_groups=self.unprivileged_groups, 
                privileged_groups=self.privileged_groups,
                verbose=0, seed=9)
            LFR_model = LFR_model.fit(self.dataset_orig_train)
            dataset_LFR_train = LFR_model.transform(self.dataset_orig_train)
            self.dataset_LFR_test = LFR_model.transform(self.dataset_orig_test)
            metric_LFR_train = BinaryLabelDatasetMetric(dataset_LFR_train, 
                                                    unprivileged_groups=self.unprivileged_groups,
                                                    privileged_groups=self.privileged_groups)
            if metric_LFR_train.num_positives(True) != 0 and metric_LFR_train.num_negatives(True) != 0 and metric_LFR_train.num_positives(False)!=0 and metric_LFR_train.num_negatives(False)!=0:
                flag = False

        metric_LFR_train = BinaryLabelDatasetMetric(dataset_LFR_train, 
                                                    unprivileged_groups=self.unprivileged_groups,
                                                    privileged_groups=self.privileged_groups)
        metric_LFR_test = BinaryLabelDatasetMetric(self.dataset_orig_test, 
                                                    unprivileged_groups=self.unprivileged_groups,
                                                    privileged_groups=self.privileged_groups)
                
        self.miti_train_lst['LFR'] = dataset_LFR_train
        self.metric_miti_train_lst['LFR'] = metric_LFR_train
        return {'train': [[metric_LFR_train.num_positives(True), metric_LFR_train.num_negatives(True)], 
                    [metric_LFR_train.num_positives(False), metric_LFR_train.num_negatives(False)]],
                'test': [[metric_LFR_test.num_positives(True), metric_LFR_test.num_negatives(True)], 
                    [metric_LFR_test.num_positives(False), metric_LFR_test.num_negatives(False)]]}

    def optim_preproc(self):
        """preprocess the train data with the optim preproc technique
            Returns:
                num {train: [[male_p, male_n], [female_p, female_n]], test: ...}
        """
        dataset_optimPreproc_train = ''
        new_df = copy.deepcopy(self.df)
        dataset_optimPreproc = load_preproc_data(new_df)
        distortion_fun = get_distortion

        # test and train data under optim_preproc
        dataset_optimPreproc_train, dataset_optimPreproc_test = dataset_optimPreproc.split([self.split_ratio], shuffle=None)
        optim_options = {
            "distortion_fun": distortion_fun,
            "epsilon": 0.05,
            "clist": [0.99, 1.99, 2.99],
            "dlist": [.1, 0.05, 0]
        }
        OptimPreproc_model = OptimPreproc(OptTools, optim_options, seed=1)
        OptimPreproc_model = OptimPreproc_model.fit(dataset_optimPreproc_train)
        dataset_optimPreproc_train = OptimPreproc_model.transform(dataset_optimPreproc_train, transform_Y=True)
        
        # transform the test data also
        self.dataset_optimPreproc_test = OptimPreproc_model.transform(dataset_optimPreproc_test, transform_Y = True)
               
        metric_optimPreproc_train = BinaryLabelDatasetMetric(dataset_optimPreproc_train, 
                                                    unprivileged_groups=self.unprivileged_groups,
                                                    privileged_groups=self.privileged_groups)
        metric_optimPreproc_test = BinaryLabelDatasetMetric(self.dataset_optimPreproc_test, 
                                                    unprivileged_groups=self.unprivileged_groups,
                                                    privileged_groups=self.privileged_groups)
        self.miti_train_lst['OptimPreproc'] = dataset_optimPreproc_train
        self.metric_miti_train_lst['OptimPreproc'] = metric_optimPreproc_train

        return {'train': [[metric_optimPreproc_train.num_positives(True), metric_optimPreproc_train.num_negatives(True)], 
                    [metric_optimPreproc_train.num_positives(False), metric_optimPreproc_train.num_negatives(False)]],
                    'test': [[metric_optimPreproc_test.num_positives(True), metric_optimPreproc_test.num_negatives(True)], 
                    [metric_optimPreproc_test.num_positives(False), metric_optimPreproc_test.num_negatives(False)]]}

    def preProcess(self, type):
        """
        calcualte different preporcessed train data
        Args:
            type (str): 'Reweighing' / 'LFR' / 'OptimPreproc'
        Returns:
            [[male_p, male_n], [female_p, female_n]] (when type = 'Reweighing', this is weights, otherwise, number)
            type=OptimPreproc: {'train': [[male_p, male_n], [female_p, female_n]], 'test': [[male_p, male_n], [female_p, female_n]]}
        """
        if type == 'Reweighing':
            return self.reweighing()
        elif type == 'LFR':
            return self.LFR()
        elif type == 'OptimPreproc':
            return self.optim_preproc()
    
    def ROC(self):
        """post processing: RejectOptionClassification 
        """
        data_info = {}
        roc_model = RejectOptionClassification(privileged_groups = self.privileged_groups,
                                unprivileged_groups = self.unprivileged_groups, num_class_thresh=500)
        roc_model = roc_model.fit(self.dataset_orig_test, self.dataset_orig_pred)
        post_res = roc_model.predict(self.dataset_orig_pred)

        metric = ClassificationMetric(    
                    self.dataset_orig_test, post_res,
                    unprivileged_groups=self.unprivileged_groups,
                    privileged_groups=self.privileged_groups)
        p_confuison_matrix = metric.binary_confusion_matrix(True)
        np_confuison_matrix = metric.binary_confusion_matrix(False)

        accuracy = metric.accuracy()
        data_info['accuracy'] = accuracy
        data_info['attrVs'] = ['Male', 'Female']

        data_info['data'] = [[[p_confuison_matrix['TP'], p_confuison_matrix['FN']], [p_confuison_matrix['FP'], p_confuison_matrix['TN']]], 
                            [[np_confuison_matrix['TP'], np_confuison_matrix['FN']], [np_confuison_matrix['FP'], np_confuison_matrix['TN']]]]
        SPD = round(metric.statistical_parity_difference(), 2)
        DI = round(metric.disparate_impact(), 2)
        EOD = round(metric.equal_opportunity_difference(), 2)
        AOD = round(metric.average_odds_difference(), 2)
        self.test_fair_metrics['SPD']['ROC'] = SPD
        self.test_fair_metrics['DI']['ROC'] = DI
        self.test_fair_metrics['EOD']['ROC'] = EOD
        self.test_fair_metrics['AOD']['ROC'] = AOD
        self.test_accuracies['ROC'] = round(accuracy, 2)
        return data_info
