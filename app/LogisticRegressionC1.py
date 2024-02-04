"""
This class is used to handle train test split, train and test LR model in the firstChapter 
"""
from copy import deepcopy
import pandas as pd
from aif360.datasets import BinaryLabelDataset
from aif360.metrics import BinaryLabelDatasetMetric
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from aif360.metrics import ClassificationMetric
from app import APP_STATIC
from os import path


class LRChapter1:
    def __init__(self):
        # 1. load the file data & fair260 dataset
        self.df = pd.read_csv(path.join(APP_STATIC,"uploads/data/creditScore.csv"))
        self.fair360_data = BinaryLabelDataset(
            df=self.df,
            label_names=['response'],        
            favorable_label=1,          # response = 1 positive; 
            unfavorable_label=0,        # response = 0 negative;
            protected_attribute_names=['gender']
        )
        self.privileged_groups = [{'gender': 1}]
        self.unprivileged_groups = [{'gender': 0}] 


    def split(self, split_ratio, keep_features=[]):
        self.split_ratio = split_ratio

        # split data using fair360
        fair360_train, fair360_test = self.fair360_data.split([split_ratio], shuffle=None)
        self.metric_fair360_train = BinaryLabelDatasetMetric(fair360_train, 
                                             unprivileged_groups=self.unprivileged_groups,
                                             privileged_groups=self.privileged_groups)
        self.metric_fair360_test = BinaryLabelDatasetMetric(fair360_test, 
                                             unprivileged_groups=self.unprivileged_groups,
                                             privileged_groups=self.privileged_groups)
       
        # split data using the sklearn
        deep_df = deepcopy(self.df)
        df_X = deep_df[['gender', 'employment', 'dependents', 'age', 'amount']]
        df_y = deep_df[['response']]
        self.X_train_ori, self.X_test_ori, self.y_train, self.y_test = train_test_split(df_X, df_y, train_size=self.split_ratio, shuffle=False)
        self.X_train = self.X_train_ori[keep_features]             # after selecting the features to keep
        self.X_test = self.X_test_ori[keep_features]
        print(self.X_train)
        return self.get_input_data_info()

    
    def get_input_data_info(self):
        def get_info(metric_data):
            return [[metric_data.num_positives(True), metric_data.num_negatives(True)], 
                    [metric_data.num_positives(False), metric_data.num_negatives(False)]]

        info = {}
        info['train'] = get_info(self.metric_fair360_train)
        info['test'] = get_info(self.metric_fair360_test)
        info['attrVs'] = ['Male', 'Female']
        return info
        

    def train_model(self):
        self.model = LogisticRegression(random_state=0)
        self.model = self.model.fit(self.X_train, self.y_train.values.ravel())

    def test_model(self):
        pred_y = self.model.predict(self.X_test)
        print(pred_y)

        #1. construct two data 
        data_df = deepcopy(self.X_test_ori)
        data_pred_df = deepcopy(self.X_test_ori)
        data_df['response'] = self.y_test.values.ravel()
        data_pred_df['response'] = pred_y
       
        data = BinaryLabelDataset(
            df=data_df,
            label_names=['response'],        
            favorable_label=1,          # response = 1 positive; 
            unfavorable_label=0,        # response = 0 negative;
            protected_attribute_names=['gender']
        )
        data_pred = BinaryLabelDataset(
            df=data_pred_df,
            label_names=['response'],        
            favorable_label=1,          # response = 1 positive; 
            unfavorable_label=0,        # response = 0 negative;
            protected_attribute_names=['gender']
        )

        #2. compute the metrics of the two
        metric = ClassificationMetric(    
                    data, data_pred,
                    unprivileged_groups=self.unprivileged_groups,
                    privileged_groups=self.privileged_groups)
        p_confuison_matrix = metric.binary_confusion_matrix(True)
        np_confuison_matrix = metric.binary_confusion_matrix(False)
        accuracy = metric.accuracy()

        # return 
        data_info = {}
        data_info['data'] = [[[p_confuison_matrix['TP'], p_confuison_matrix['FN']], [p_confuison_matrix['FP'], p_confuison_matrix['TN']]], 
                            [[np_confuison_matrix['TP'], np_confuison_matrix['FN']], [np_confuison_matrix['FP'], np_confuison_matrix['TN']]]]

        data_info['accuracy'] = accuracy
        data_info['attrVs'] = ['Male', 'Female']

        return data_info
    
