'''
Process the configuration files
'''
from email.errors import HeaderDefect
import os
import re

from requests import head
from app import APP_STATIC
from .utils import get_table_Json

CONFIF_PATH  = os.path.join(APP_STATIC, 'uploads/chapters/')

class ProcessConfig:
    def __init__(self):
        self.chapter_num = 0
        for file_name in os.listdir(CONFIF_PATH):
            if len(file_name) > 7:
                if file_name[: 7] == 'chapter':
                    self.chapter_num += 1

        self.chapter_title_lst = []      # the chapter title list
        self.get_title_lst()
    
    def get_title_lst(self):
        for i in range(self.chapter_num):
            chapter_title = self.get_chapter_name(str(i+1))
            self.chapter_title_lst.append(chapter_title)

    def get_chapter_name(self, name):
        with open(CONFIF_PATH+'/chapter'+str(name)+'.tex', 'r') as f:
            content = f.read()
            searchTitleObj = re.search(r'\\section{(.*)}', content, re.M|re.I)
            return searchTitleObj.group(1)
    
    def get_content_item(self, item):
        head = item[0: 4]
        vc_content = item[4:]
        res = ''

        if head == 'Set}':
            set_lst = []
            content_lst = re.split(r'\\begin{VC(.*?)\\end{VCSet}|\\begin{visualCompon(.*?)\\end{visualComponent}|\\begin{ta(.*?)\\end{table}|\\begin{b(.*?)\\end{boxK}|\\begin{fig(.*?)\\end{figure}', 
                vc_content, flags=re.S)
            for set_item in content_lst:
                if set_item == None or not set_item.strip():
                    continue
                set_lst.append(self.get_content_item(set_item))
            return {"type": "VCSet", "content": set_lst}
        
        if head == 'ent}':    # visual component
            res = {"type": "visualComponent", "content": self.get_visual_compo_JSON(vc_content)}
        elif head == 'ble}':  # table
            res = {"type": "table", "content": get_table_Json(vc_content)}
        elif head == "oxK}":
            item_ = vc_content.strip()
            item_ = '\\documentclass{article} \\usepackage{hyperref} \\begin{document}'+item_ + '\\end{document}'
            res = {"type": "box", "content": item_}
        elif head == 'ure}':
            res = {"type": "figure", "content": self.get_figure_JSON(vc_content)}
        else:
            item_ = item.strip()
            # implement the full
            item_ = '\\documentclass{article} \\usepackage{hyperref} \\begin{document}'+item_ + ' \\end{document}'
            res = {"type": "text", "content": item_}

        return res


    def get_chapter(self, id):
        """
        return the content of this chapter

        Args:
            id : the id of this chapter
        
        Returns:
        [{"type": "text", "content": "text...”},
         {"type": "visualComponent", "content": {"name": table, .... }},
         {"type": "table", "content": tableJson}
         {"type": "box", "content": "text..."}
         {"type": "figure", "content": {"name": , "caption": }}
         // if it is a visual component set,
         [
            {"type": "text", "content": "text...”},
            {"type": "visualComponent", "content": {"name": table, .... }},
            .... 
         ]
        ]
        """
        chapter_content = []
        with open(CONFIF_PATH+'/chapter'+str(id)+'.tex', 'r') as f:
            content = f.read()
            # split this content into a list
            pre_content = self.detect_footnote(content)
            content = pre_content['content']
            refers = pre_content['references']

            content_lst = re.split(r'\\begin{VC(.*?)\\end{VCSet}|\\begin{visualCompon(.*?)\\end{visualComponent}|\\begin{ta(.*?)\\end{table}|\\begin{b(.*?)\\end{boxK}|\\begin{fig(.*?)\\end{figure}', 
                content, flags=re.S)
            for item in content_lst:
                if not item:
                    continue
                chapter_content.append(self.get_content_item(item))

            if refers:
                chapter_content.append({"type": "refer", "content": refers})
        return chapter_content
    
    def detect_footnote(self, content):
        """
        find all \footnote in this content, and replace them as [1] [2] .., then return a rerference list

        Args: 
            content(str): the content in this chapter
        Returns:
            {
                content: content after modifying
                references: ''
            }
        """        
        searchReferObj = re.findall(r'\\footnote{(.*?)}', content, re.M|re.I)
        references = []
        for index, obj in enumerate(searchReferObj):
            obj = '['+str(index+1)+'] '+obj.strip()
            references.append(obj)
            
        # replace a specific syntax
        self.refer_count = 0
        def refer_order(match):
            self.refer_count += 1
            return '['+str(self.refer_count)+']'
        new_content = re.sub(r'\\footnote{(.*?)}', refer_order, content) 
        return {
            'content': new_content,
            'references': references
        }

    def get_visual_compo_JSON(self, content):
        """ get the json representation of a visual component

        Args:
            content (str): the content of this visual component
                -Table: \name{Table}
                -CustomizeData: \name{CustomizeData}
                -TrainModel: \name{TrainModel} \data{original} \model{LR}
                -TestModel: \name{TestModel} \data{original} \model{LR}
                -FairMetrics: \name{FairMetrics} \data{'Original'} \metrics{SPD, DI, EOD, AOD} \interaction{True}
                -PreProcess: \name{PreProcess} \type{Reweighing}  'LFR', 'OptimPreproc'
                -Accuracy: \name{Accuracy} \type{'Original'}
                -MLPipeline: \name{MLPipeline} \trainData{Original} \model{LR}
                -PostProcess: \name{PostProcess} \type{ROC}
            visual components designed for the Project Chapter
                -Input: \name{Input}
                -TrainModelCustomize: \name{TrainModelCustomize}
                -MLPipelineF: \name{MLPipelineF}
                -FairMetricsF: \name{FairMetricsF}
                -AccuracyF: \name{AccuracyF}
        Results:
            {
                name: Table/CustomizeData ...
            }
        """
        info_json = {}

        name = re.search(r'\\name{(.*)}', content, re.M|re.I).group(1)
        info_json['name'] = name
        if name == 'TrainModel' or name == 'TestModel':
            info_json['data'] = re.search(r'\\data{(.*)}', content, re.M|re.I).group(1)
            info_json['model'] = re.search(r'\\model{(.*)}', content, re.M|re.I).group(1)
        elif name == 'PreProcess' or name == 'Accuracy' or name == 'PostProcess':
            info_json['type'] = re.search(r'\\type{(.*)}', content, re.M|re.I).group(1)
        elif name == 'MLPipeline':
            info_json['trainData'] = re.search(r'\\trainData{(.*)}', content, re.M|re.I).group(1)
            info_json['model'] = re.search(r'\\model{(.*)}', content, re.M|re.I).group(1)
        elif name == 'FairMetrics':
            info_json['data'] = re.search(r'\\data{(.*)}', content, re.M|re.I).group(1)
            info_json['metrics'] = re.search(r'\\metrics{(.*)}', content, re.M|re.I).group(1).strip('\'') .split(',')
            info_json['metrics'] = [ele.strip() for ele in info_json['metrics']]
            info_json['interaction'] = re.search(r'\\interaction{(.*)}', content, re.M|re.I).group(1)
        
        return info_json
    

    def get_figure_JSON(self, figure_tex):
        """ transform the figure format in the .tex files into the json format

            Args:
                figure_tex(str): 
                    \name{equality.png}
                    \caption{...}
        
            Returns:
                {
                    name: 
                    caption:
                }

        """
        info_json = {}
        name = re.search(r'\\name{(.*)}', figure_tex, re.M|re.I).group(1)
        caption = re.search(r'\\caption{(.*)}', figure_tex, re.M|re.I).group(1)
        info_json['name'] = name
        info_json['caption'] = caption
        return info_json
    
