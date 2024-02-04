// global info for visual components
let modelNameMap = {'LR': 'Logistic Regression', 'Adversarial': 'Adversarial Debiasing', 'PrejudiceRmv': 'Prejudice Remover'};
let trainNameMap = {'LFR': 'Learning fair representations', 'Reweighing': 'Reweighing', 'OptimPreproc': 'Optimized preprocessing'};
let curChapterId = 0;

let confusionMatrixData = '';  // not sure if it's usable

/**
 * Render one chapter
 *      - render one chapter
 *      - directly render text, img, refer, and table in this class
 *      - get visual components but give them to other classes
 */
class RenderChapterHandler{
    constructor(){
        this.VCLst = [];    // A list of Visual Component / Visual Component Set ([obj]) objects in this chapter
        this.contentDiv = d3.select('#contentDiv');
    }

    /**
     * render the content of the latex onto the web page
     * @param {*} contentLst
     *      [{"type": "text", "content": "text...”},
     *       {"type": "visualComponent", "content": {"name": table, .... }},
     *       {"type": "text", "content": "text..."}
     *      ]
     * @param {*} pageId the id of this page
     */
    async renderChapter(contentLst, chapterId){
        globalIdentifier = 0;
        this.reset(chapterId);
        // render each part in this list
        for(let i = 0; i < contentLst.length; i++){
            let item = contentLst[i];
            let type = item['type'];        // the type of this node
            let content = item['content'];

            switch(type){
                case 'text':
                case 'box':
                    this.renderText(type, content);
                    break;
                case 'table':
                    this.renderTable(content);
                    break;
                case 'refer':
                    this.renderRefer(content);
                    break;
                case 'figure':
                    this.renderFig(content);
                    break;
                case 'visualComponent':
                    let vcObj = await renderVC(content);
                    if(vcObj){this.VCLst.push(vcObj)}
                    break;
                case 'VCSet':
                    let vcSetObj = new VCSet(content);
                    await vcSetObj.init();
                    this.VCLst.push(vcSetObj);
                    break;
            }

        }
    }

    // clear content and reset some variables
    async reset(chapterId){
        // reset the VC list in this chapter
        this.VCLst = [];
        // clean this chapter
        this.contentDiv.selectAll('.content').remove();
        this.contentDiv.selectAll('.tableContainer').remove();
        this.contentDiv.selectAll('.imgContainer').remove();
        d3.selectAll('.newVisualComponent').remove(); // remove all newly added Visual Component
        d3.selectAll('h3').remove();    // remove h3 used to split reference

        // reset all train data
        curChapterId = chapterId;
        weights = '';
        trainData = '';
        LRFTrainData = '';
        OptimPreprocTrainData = '';
        testData = '';
        confusionMatrixData = '';

        // if this is the 4th chapter then request the train and test data
        outputLabel = outputDict['German'];
        attrVs = attrValueDict['German'];
        yScaleBar = yScaleBarDict['German'];
        // if(chapterId == 3 || chapterId == 2){
        //     await axios.post('/startDebias')
        //         .then((response)=>{ // getTrainTest
        //             let data = response.data;
        //             trainData = data['train'];
        //             testData = data['test'];
        //             confusionMatrixData = data['output'];
        //         })
        //         .catch((error)=>{
        //             console.log(error);
        //         });
        // }
    }

    /**
     * render text or box
     * @param {*} type text or box 
     * @param {*} content content inside
     */
    renderText(type, content){
        let generator = new latexjs.HtmlGenerator({hyphenate: false });
        generator = latexjs.parse(content, { generator: generator })
        document.head.appendChild(generator.stylesAndScripts("https://cdn.jsdelivr.net/npm/latex.js@0.12.4/dist/"));
        
        // get the content of the div and reset the titles
        let contentD = generator.domFragment();
        let contentSelector = d3.select(contentD).select('div');
        // remove the number of all titles
        contentSelector.selectAll('h1, h2, h3, h4')
            .text(function(){
                let text = d3.select(this).text();
                text = text.replace(/[0-9]/g, '');
                text = text.replaceAll('.', '');
                text = text.trim();
                return text;
            });
        // if this is a box
        if(type=='box'){ contentSelector.classed('box', true);}
        contentSelector.classed("content", true);
        this.contentDiv.node().appendChild(contentSelector.node());
    }

    /**
     * render table using grid.js (when table is not in visual components)
     * tableData: json data
     * {
     *   columns: [a, b, c, d],
     *   data: [[], [], [], ...]
     * }
     */
    async renderTable(tableData){
        let rowNums = tableData['data'].length+1;
        let height = rowNums*45>600? 600 : rowNums*60;

        let tableDiv = this.contentDiv.append('div').classed('tableContainer', true)
            .style('height', height+20+'px');

        await new gridjs.Grid(tableData).updateConfig({'height': height+'px', 'fixedHeader': true, 'width': null, 'max-width': '100%'})
            .render(tableDiv.node());
    }

    // add the reference of this page
    renderRefer(referLst){
        this.contentDiv.append('h3').text('');
        for(let i = 0; i<referLst.length; i++){
            this.contentDiv.append('refer').text(referLst[i]).classed("content", true);;
        }
    }
    
    // add fig
    renderFig(figJson){
        let figPath = '/static//uploads/images/'+figJson['name'];
        let caption = figJson['caption'];
        this.contentDiv.append('img').attr('src', figPath).attr('alt', 'fig').classed('imgContainer', 'true');
        this.contentDiv.append('imgCaption').text('FIGURE '+caption).classed('imgContainer', 'true');
    }

}

/**
 * enable all buttons at this pages
 *      - trigger when press a button
 */
function enableChapterBtns(){
    // let VCs = VCLstPerChapter[curChapterId-1];  // all visual components at this pages 
    // for(let key in VCs){
    //     let VC = VCs[key];
    //     if(typeof VC['enableBtns'] === 'function'){
    //         VC.enableBtns();
    //     }
    // }
}


/**
 * disenable all buttons at this pages
 *      - trigger when receive a response from the server
 */
function disableChapterBtns(){
    // let VCs = VCLstPerChapter[curChapterId-1];  // all visual components at this pages 
    // for(let key in VCs){
    //     let VC = VCs[key];
    //     if(typeof VC['disableBtns'] === 'function'){
    //         VC.disableBtns();
    //     }
    // }
}