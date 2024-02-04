'''
This script includes a set of common used functions handling file processing...
'''
import enum
from operator import le
from matplotlib.pyplot import table
import numpy as np
import pandas as pd
import random
from aif360.datasets import StandardDataset


from sklearn.covariance import ledoit_wolf

# read csv file into numpy format
# return the feature_lst and the data in np format
def read_csv(file_path):
    csv_data = pd.read_csv(file_path)
    feature_lst = list(csv_data.columns)
    data = csv_data.to_numpy()

    return feature_lst, data

# sample sample_num rows from the datalst
# if still need to return the left lst
# datalst = [[], [], ...]
def sample_data(datalst, sample_num, left):
    total_num = len(datalst)
    sample_reverse = False if sample_num > total_num/2 else True  # if we need to sample more, then we sample the less one
    if sample_reverse:
        sample_num = total_num - sample_num

    random_lst = []  # get the sample result
    while len(random_lst) != sample_num:
        random_num = random.randint(0, total_num)
        if random_num not in random_lst:
            random_lst.append(random_num)
    
    sample_lst = []
    sample_left_lst = []
    for i in range(total_num):
        if i in random_lst:
            sample_lst.append(datalst[i])
        else:
            sample_left_lst.append(datalst[i])
    
    sample_lst = np.array(sample_lst)
    sample_left_lst = np.array(sample_left_lst)

    # output two lists
    if left:
        if sample_reverse:
            return (sample_left_lst, sample_lst)
        else:
            return (sample_lst, sample_left_lst)
    else:
        if sample_reverse:
            return sample_left_lst
        else:
            return sample_lst


'''
return the confusion matrix, where attr_idx == value
[TP, FP, NF, TN]
'''
def get_confusion_matrix(fullData, label_y, predict_y, attr_idx, value):
    res = {'TP': 0, 'FP': 0, 'FN': 0, 'TN': 0}

    if attr_idx:
        for idx, item in enumerate(fullData):
            if item[attr_idx] == value:
                if predict_y[idx] == 1 and label_y[idx] == 1:
                    res['TP'] += 1
                elif predict_y[idx] == 1 and label_y[idx] == 0:
                    res['FP'] += 1
                elif predict_y[idx] == 0 and label_y[idx] == 1:
                    res['FN'] += 1
                elif predict_y[idx] == 0 and label_y[idx] == 0:
                    res['TN'] += 1
    else:
        for idx, item in enumerate(fullData):
            if predict_y[idx] == 1 and label_y[idx] == 1:
                res['TP'] += 1
            elif predict_y[idx] == 1 and label_y[idx] == 0:
                res['FP'] += 1
            elif predict_y[idx] == 0 and label_y[idx] == 1:
                res['FN'] += 1
            elif predict_y[idx] == 0 and label_y[idx] == 0:
                res['TN'] += 1
    
    return res


def check_has_key(dict_list, key):
    """
    check if a dict list has a specific key

    Args:
        dict_list (lst): [{'original': 0.95}, {'mitigate': 0.2}...]
        key (str): original
    
    Returns:
        True/False
    """
    for dict in dict_list:
        if list(dict.keys())[0] == key:
            return True
    
    return False


def find_key_from_lst(dict_list, key):
    """
    return the value of the key from the dict_list

    Args:
        dict_list (lst): [{'original': value}, {'mitigate': value}...]
        key (str): original
    
    Returns:
        value
    """
    for dict in dict_list:
        if list(dict.keys())[0] == key:
            return dict[key]

def load_preproc_data(df):
    """
    process the data into categorical attributes
        - dependents=1, dependents=2, ageGroup1 
    Args:
        df : dataframe
    Returns:
        midified dataframe
    """
    def custom_preprocessing(df):
        """
            continous -> categorical (replace the original values)
            dependents; age; amount
        """
        def group_age(x):
            '''
            19-25(0); 25-30(1); 30-35(2); 35-40(3); 40-50(4); 50-60(5); >60(6);
            '''
            x = int(x)
            if x<25:
                return 0
            elif 25<=x<30:
                return 1
            elif 30<=x<40:
                return 2
            elif 40<=x<55:
                return 3
            else:
                return 4

        def group_amount(x):
            '''
            250-500(0)500-1000(1)1000-1500(2)1500-2000(3)2000-3000(4)3000-4000(5)4000-5000(6)>5000(7)
            '''
            x = int(x)
            if x<1000:
                return 0
            elif 1000<=x<2000:
                return 1
            elif 2000<=x<3000:
                return 2
            elif 3000<=x<5000:
                return 3
            else:
                return 4

        df['age'] = df['age'].apply(lambda x: group_age(x))
        df['amount'] = df['amount'].apply(lambda x: group_amount(x))

        return df

    return StandardDataset(df, 
        label_name='response', 
        favorable_classes=[1],
        protected_attribute_names=['gender'],
        privileged_classes=[[1]],
        instance_weights_name=None,
        categorical_features=['age', 'amount'],
        features_to_drop=[],
        custom_preprocessing=custom_preprocessing
        )


def get_distortion(vold, vnew):
    '''
    employment,dependents,age,amount,response
    '''
    # print('vold', vold)
    # print('vnew', vnew)
    def adjust(a):
        return int(a)
    
    def getcost(attr, new, old):
        new = adjust(new)
        old = adjust(old)
        dis = abs(new-old)

        if attr == 'employment':
            return 2 if dis == 1 else 0
        elif attr == 'dependents':
            return 1 if dis == 1 else 0
        elif attr == 'age':
            if dis == 0:
                return 0
            elif dis < 2:
                return 1
            elif dis < 4:
                return 2
            else:
                return 3
        elif attr == 'amount':
            if dis == 0:
                return 0
            elif dis < 2:
                return 1
            elif dis < 4:
                return 2
            else:
                return 3
        elif attr == 'response':
            return 1 if dis == 1 else 0

    total_cost = 0.0
    for k in vold:
        if k in vnew:
             total_cost += getcost(k, vnew[k], vold[k])
    return total_cost



def load_preproc_data_bank(df):
    """
    process the bank data into categorical attributes
        - dependents=1, dependents=2, ageGroup1 
    Args:
        df : dataframe
    Returns:
        midified dataframe
    """





def get_table_Json(table_tex):
    """ transform the table format in the .tex files into the json format used in the Grid.js\

        Args:
            table_tex(str) : table format in the .tex files 
            Gender & GPA  & Job Offered \\
            F      & 4    & Y           \\
            M      & 3.9  & Y           \\

        Returns: json format used in the Grid.js
            {
                columns: [a, b, c, d],
                data: [[], [], [], ...]
            }
    """
    table_json = {'columns': [], 'data': []}
    row_lst = table_tex.split(r'\\')
    for idx, row in enumerate(row_lst):
        row_lst = [ele.strip() for ele in row.split('&')]
        if idx == 0:
            table_json['columns'] = row_lst
        else:
             table_json['data'].append(row_lst)
    return table_json


