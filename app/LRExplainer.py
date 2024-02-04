"""
This class is used to handle the request from the Logistic Regression Explain visual component 
"""
import numpy as np
from app import APP_STATIC
from os import path
from sklearn.linear_model import LogisticRegression


class lrExplainer:
    def __init__(self):
        # 1. read and create the train and test data
        train_data = np.loadtxt(path.join(APP_STATIC,'uploads/data/credit.csv'), delimiter=',')
        test_data = np.loadtxt(path.join(APP_STATIC,'uploads/data/creditTest.csv'), delimiter=',')

        # 2. process the train and test data into array
        self.train_X = np.atleast_2d(train_data[:, 0]).T
        self.train_y = train_data[:, 1]
        self.test_X = np.atleast_2d(test_data[:, 0]).T
        self.test_y = test_data[:, 1]

        # 3. get the dict list representation of train and test data
        self.train_dict_lst = self.arr_to_dict(self.train_X, self.train_y)
        self.test_dict_lst = self.arr_to_dict(self.test_X, self.test_y)


    def train_model(self, train_data):
        """train the model with the train data
            Args:
                train_data(dict):[{'score': , 'y': }, {}, ...]
            Returns:
                coes for the Logistic Regression model {'a': , 'b': }
        """
        #1. update the train data
        self.train_X, self.train_y = self.dict_to_arr(train_data)

        #2. train the model
        self.model = LogisticRegression(random_state=0)
        self.model = self.model.fit(self.train_X, self.train_y)
        #3. get the coefficient of the data
        self.coe = self.model.coef_[0][0]
        self.intercept = self.model.intercept_[0]

        return {'a': self.coe, 'b': self.intercept}


    def test_model(self, test_data):
        """test the model with the test data
            Args:
                test_data(dict):[{'score': , 'y': }, {}, ...]
            Returns:
                Res: [{'score': , 'y': , pred: ,}, {}, ...]
        """ 
        #1. update the test data
        self.test_X, self.test_y = self.dict_to_arr(test_data)

        pred_y = self.model.predict(self.test_X)
        
        pred_dict_lst = []
        for test_X_val, test_y_y, pred_y_y in zip(self.test_X, self.test_y, pred_y):
            pred_dict_lst.append({'score': float(test_X_val[0]), 'y': int(test_y_y), 'pred': int(pred_y_y)})

        return pred_dict_lst


    def dict_to_arr(self, dict_lst):
        """dict dataset to arrays
        Args:
            dict_lst: [{'score': , 'y': }, {}, ...]
        
        Returns:
            X: [[1], [2], [3], ...] (score)
            y: [0, 1, 1, 0, ...] (y)
            (X, y)
        """
        X = []
        y = []
        for dic in dict_lst:
            X.append([dic['score']])
            y.append(dic['y'])
        
        return (np.array(X), np.array(y))

    
    def arr_to_dict(self, X, y):
        """arrays to dict
        Args:
            X: [[1], [2], [3], ...] (score)
            y: [0, 1, 1, 0, ...] (y)

        Returns:
            [{'score': , 'y': }, {}, ...]
        """
        dict_lst = []
        for X_val, y_val in zip(X, y):
            dict_lst.append({'score': X_val[0], 'y': y_val})
        return dict_lst
