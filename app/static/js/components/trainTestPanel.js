/**
 * Visual component iuncluding train and test data
 */
let globalIdentifier = 0;

class TrainAndTestPanel{
    /**
     * @param {*} containerSelector 
     * @param {*} trainName the type of the train data: Original, Reweighing, ...
     * @param {*} modelName LR, Adversarial, PrejudiceRmv...
     */
    constructor(templateId, trainName, modelName, setPosition, VCSet){
        // poperties of this modular
        this.name = 'MLPipeline';
        this.setPosition = setPosition;
        this.VCSet = VCSet;
        this.trainName = trainName;
        this.modelName = modelName;
        this.from_customize = false;
        this.identifier = globalIdentifier; // identifier for the arrow rendering
        globalIdentifier += 1

        // clone the template
        const visualComponentNode = document.getElementById(templateId);
        const cloneNode = visualComponentNode.content.cloneNode(true).querySelector('.visualComponentContainer');
        document.getElementById('contentDiv').appendChild(cloneNode);
        d3.select(cloneNode).classed('newVisualComponent', true) // 'newVisualComponent' as a label for future removal
            .style('display', setPosition==0||setPosition==-1? 'grid':'none'); // reveal the div only if setPosition == -1 or 0

        /*1. div*/
        this.MLPipelineDiv = d3.select(cloneNode);
        this.inputDiv = this.MLPipelineDiv.select('.inputDiv');
        this.modelCTNDiv = this.MLPipelineDiv.select('.modelCTNDiv');
        this.outputContainer = this.MLPipelineDiv.select('.outputContainer');
        this.outputDiv = this.outputContainer.select('.outputDiv');
        this.colorMapDiv = this.outputContainer.select('.colorMapDiv');
        this.modelCNTsvg = '';
        // selectors for the 4 panels
        this.trainDiv = this.inputDiv.select('.trainDataDiv');
        this.testDiv = this.inputDiv.select('.testDataDiv');
        this.modelDiv = this.modelCTNDiv.select('.modelDiv');
        /*2. Button*/
        this.trainButton = this.modelCTNDiv.select('.trainBtn');
        this.testButton = this.modelCTNDiv.select('.testBtn');
        /*3. reminder for the successfully train and ask to train */
        this.sucReminder = '';
        this.trnReminder = '';

        // data of this VC
        this.trainData = '';
        this.testData = '';
        this.confusionMatrixData = '';
        this.lastConfusionMatrixData = '';
        this.coefs = '';    // weights when using reweighing method
        this.lastAccuracy = ''; // last accuary

        // four lines connecting different part
        this.trainModelLine = '';
        this.evalModelLine = '';
        this.predictModelLine = '';

        // legends for the input and output
        this.inputLegend = '';
        this.outptLegend = '';
        
        // highlight border
        this.highlightColor = '#4384F4';

        // the opacity when fade in a visual component
        this.fadeOpacity = 0.4;

        // indicator if we can test the model
        this.modelReady = false;

        // settingUp
        this.arrowColor = '#777777';

        if(this.modelName!='LR'){
            this.activate();
        }

    }

    /**
     * activate this model
     */
     async activate(trainName='', modelName='', from_customize=false){
        this.from_customize = from_customize;   // whether this component is with the C2
        if(trainName){this.trainName = trainName;}
        if(modelName){this.modelName = modelName;}        
        this.MLPipelineDiv.style('display', 'grid');    // reveal the div        

        // if [C2, C3], then get the train (original) and test data from the VCSet
        if(this.from_customize){
            this.trainData = this.VCSet.data.trainData.Original;
            this.testData = this.VCSet.data.testData;
        }

        // 1. get the test/train data if in preprocessing step
        // (here we assume this vc is in the VC set, and the train and test data are ready)
        if(this.trainName == 'Reweighing'){
            this.trainData = this.VCSet.data.trainData[this.trainName];
            this.testData = this.VCSet.data.testData ;
        }
        else if(this.trainName == 'LFR' || this.trainName == 'OptimPreproc'){
            this.trainData = this.VCSet.data.trainData[this.trainName];
            this.testData = this.VCSet.data.testData ;
        }
        /**
         * in-processing
         */
        if(!this.trainData){
            await axios.post('/startDebias')
            .then((response)=>{
                this.trainData = response.data['train'];
                this.testData = response.data['test'];
                // if in VCSet, save it to the VC set data area
                if(this.VCSet){
                    this.VCSet.data.trainData.Original = this.trainData;
                    this.VCSet.data.testData = response.data['test'];
                }
            })
            .catch((error)=>{
                console.log(error);
            });
        }

        if(!this.from_customize){
            // get the base accuracy and confusion matrixData
            await axios.post('/getBaseAccCF', {
                type: 'Original',
            })
            .then((response)=>{
                this.lastConfusionMatrixData = response.data['CF']; 
                this.lastAccuracy = response.data['accuracy'];
            })
            .catch((error)=>{
                console.log(error);
            });
        }
        // 2. init the layout
        this.init();
        // 3. add event listener on the train button
        this.trainButton.on('click', ()=>this.trainModel());
        // 4. set train style 
        this.trainStyle();
    }

    /**
     * After activation init the layout
     * 1. render the input div (legend, train data, test data)
     * 2. add svg in the model container panel
     * 3. place the position of the model
     * 4. add arrows
     * 5. add buttons
     */
    init(){
        // render legend
        styleLegend(this.inputDiv.select('.legendDiv'));
        // render train data / test data
        if(this.trainName=='Original'){
            visTrainOrTestData(this.trainDiv, this.trainData, `Training Data`);
        }
        else if(this.trainName=='Reweighing'){
            visTrainOrTestData(this.trainDiv, this.VCSet.data.trainData['Original'], 'Training Data after Reweighing', 
            this.VCSet.data.trainData['Reweighing']);
        }
        else{
            visTrainOrTestData(this.trainDiv, this.trainData, `Training Data after ${this.trainName}`);
        }
        visTrainOrTestData(this.testDiv, this.testData, 'Test Data');

        // add svg
        this.modelCTNDiv.select('svg').remove();
        this.modelCNTsvg = this.modelCTNDiv.append('svg').style('width', '100%').style('height', '100%');

        // compute the position
        let modelDiv = this.modelCTNDiv.select('.modelDiv');
        let svgWid = parseFloat(this.modelCTNDiv.style('width'));
        let svgHei = parseFloat(this.modelCTNDiv.style('height'));
        let modelWid = parseFloat(modelDiv.style('width'));
        let modelHei = parseFloat(modelDiv.style('height'));
        let legendHei = parseFloat(this.inputDiv.select('.legendDiv').style('height'));
        let trainHei = vwTopx(this.inputDiv.select('.trainDataDiv').style('height'));
        let testHei = vwTopx(this.inputDiv.select('.testDataDiv').style('height'));
        let marginBtm = parseFloat(this.inputDiv.select('.testDataDiv').style('margin-bottom'));
        // model div from center to bottom
        let modelDivCHei = svgHei-(testHei>modelHei? testHei/2: modelHei/2)-marginBtm;
        // layout the model div
        modelDiv.style('top', `${modelDivCHei-modelHei/2}px`);

        // add arrows
        let arrowG = this.modelCNTsvg.append("g");
        let arrow_height = 7.5;
        arrowG.append("defs")       // create an arrow marker
            .append("marker")
            .attr("id", `trainArrowheadId-${this.identifier}`)
            .attr("markerWidth", 13)
            .attr("markerHeight", 13)
            .attr("refX", "0")
            .attr("refY", 3)
            .attr("orient", "auto")
            .attr("markerUnits","strokeWidth")
            .attr("stroke-width","13")
            .append("path").attr("d", "M0,0 L0,6 L9,3 z").attr("fill",this.arrowColor);
        arrowG.append("defs")       // create an arrow marker for train and test, respectivly
            .append("marker")
            .attr("id", `testArrowheadId-${this.identifier}`)
            .attr("markerWidth", 13)
            .attr("markerHeight", 13)
            .attr("refX", "0")
            .attr("refY", 3)
            .attr("orient", "auto")
            .attr("markerUnits","strokeWidth")
            .attr("stroke-width","13")
            .append("path").attr("d", "M0,0 L0,6 L9,3 z").attr("fill",this.arrowColor);
        this.trainModelLine = arrowG.append("g");
        this.trainModelLine.append("line")
            .attr("x1", 0)
            .attr("y1", legendHei+trainHei/2)
            .attr("x2", svgWid/2)
            .attr("y2", legendHei+trainHei/2)
            .classed('arrowLine', true);
        this.trainModelLine.append("line")
            .attr("marker-end", `url(#trainArrowheadId-${this.identifier})`)
            .attr("x1", svgWid/2)
            .attr("y1", legendHei+trainHei/2)
            .attr("x2", svgWid/2)
            .attr("y2", modelDivCHei-modelHei/2-arrow_height-3)
            .classed('arrowLine', true); 
        this.evalModelLine = arrowG.append("line")
            .attr("marker-end", `url(#testArrowheadId-${this.identifier})`)
            .attr("x1", 0)
            .attr("y1", modelDivCHei)
            .attr("x2", (svgWid-modelWid)/2-arrow_height-3)
            .attr("y2", modelDivCHei)
            .classed('arrowLine', true);
        this.predictModelLine = arrowG.append("line")
            .attr("marker-end", `url(#testArrowheadId-${this.identifier})`)
            .attr("x1", (svgWid+modelWid)/2)
            .attr("y1", modelDivCHei)
            .attr("x2", svgWid-arrow_height-3)
            .attr("y2", modelDivCHei)
            .classed('arrowLine', true);
        // reminder
        this.sucReminder = this.modelCNTsvg.append('text').classed('reminder', true).attr('dy', '1em');
        this.trnReminder = this.modelCNTsvg.append('text').classed('reminder', true).attr('dy', '1em');

        // position buttons
        let trainBtnWid = parseFloat(this.trainButton.style('width'));
        let testBtnWid = parseFloat(this.testButton.style('width'));
        let btnHei = parseFloat(this.testButton.style('height')); 
        this.trainButton.style('left', `${svgWid/4-trainBtnWid/2}px`).style('top', `${legendHei+trainHei/2-btnHei-3}px`);
        this.testButton.style('left', `${(svgWid-modelWid)/4-testBtnWid/2}px`).style('top', `${modelDivCHei-btnHei-3}px`);
        this.sucReminder.attr('x', svgWid/4).attr('y', legendHei+trainHei/2)
            .style('fill', this.highlightColor);
        this.trnReminder.attr('x', (svgWid-modelWid)/4).attr('y', modelDivCHei/2+trainHei/2)
            .style('fill', '#E06666');
        
        // change the model name
        this.modelDiv.select('.modelName').text(modelNameMap[this.modelName]);
    }

    /**
     * train model
     */
    async trainModel(){
        this.modelReady = false;
        this.trainStyle();
        this.trainButton.on('click', null);
        this.testButton.on('click', null);
        this.trainingReminder();
        // 2. train
        let link = this.from_customize? '/trainModelC1':'/trainModel';
        await axios.post(link, {'modelName': this.modelName, 'trainName': this.trainName})
            .then((response)=>{
                clearInterval(this.trainingReminder);
                // 0. set the model ready and enable all buttons
                this.modelReady = true; 
                // 1. change the test style
                this.testStyle();
                // enableChapterBtns();                
                // 2. enable the train and test
                this.trainButton.on('click', ()=>this.trainModel());
                this.testButton.on('click', ()=>this.testModel());
                // 3. successfully train the model show the words
                this.successReminder();
            })
            .catch((error)=>{
                console.log('error', error);
            });
    }

    /**
     * click on the test model, then test the model
     */
    async testModel(){
        // // 0. disable all btns
        // disableChapterBtns();

        // 1. disable the train and test
        this.trainButton.on('click', null);
        this.testButton.on('click', null);

        // // 2. clear the success text
        this.sucReminder.html('');
        clearTimeout(this.successTimer);
        
        let name = this.trainName;
        let link = this.from_customize? '/testModelC1':'/testModel';

        // metric_name
        let metricName = "Original";
        if(this.trainName&&this.trainName!='Original'){
            metricName = this.trainName;
        }
        if(this.modelName&&this.modelName!='LR'){
            metricName = this.modelName;
        }

        /**
         * The result of this model:
         * {accuracy: 0.725, attrVs: ['Male', 'Female'] data: [Array(2), Array(2)]}
         */
        await axios.post(link, {'dataName': 'test', 'metricName': metricName, 'model': this.modelName})
            .then((response)=>{ 
                // enableChapterBtns();           
                // init the global attr: confusionMatrixData & the confusion matrix scale
                this.confusionMatrixData = response.data['data'];
                if(this.VCSet){this.VCSet.data.confusionMatrixData = this.confusionMatrixData;} // if it's in a set, then store it into the set obj
                // make all div visible
                this.outputDiv.selectAll('div').style('opacity', '1');
                this.outputDiv.style('border-style', 'solid');

                // visualize the accuacy change
                let accuracy = response.data['accuracy'];
                let accChange = '';
                if(this.lastAccuracy){accChange = accuracy-this.lastAccuracy;}  // chapter 1 doesn't have 'lastAccuracy' at the beginning
                if(this.from_customize){this.lastAccuracy = accuracy;}  // change the lastAccuracy only in the chapter1 

                // visualize the change prediction
                let malePredChange = '';
                let femalePredChange = '';
                if(this.lastConfusionMatrixData){
                    let maleM = this.confusionMatrixData[0];
                    let maleML = this.lastConfusionMatrixData[0];
                    let femaleM = this.confusionMatrixData[1];
                    let femaleML = this.lastConfusionMatrixData[1];
                    malePredChange = [maleM[0][0]+maleM[1][0]-maleML[0][0]-maleML[1][0], maleM[0][1]+maleM[1][1]-maleML[0][1]-maleML[1][1]];
                    femalePredChange = [femaleM[0][0]+femaleM[1][0]-femaleML[0][0]-femaleML[1][0], femaleM[0][1]+femaleM[1][1]-femaleML[0][1]-femaleML[1][1]];
                }
                if(this.from_customize){ 
                    this.lastConfusionMatrixData = this.confusionMatrixData; // change the lastAccuracy only in the chapter1 
                    // malePredChange = [0, 0];    // chapter1 doesn't show the change of the confusion matrix
                    // femalePredChange = [0, 0];
                }
                visOutputPanel(this.outputDiv, response.data, this.colorMapDiv, '', '', accChange, malePredChange, femalePredChange);
                
                // enable the test and train process
                this.trainButton.on('click', ()=>this.trainModel());
                this.testButton.on('click', ()=>this.testModel());

                // if it's in a set, then activate the fairness metrics
                if(this.VCSet){this.VCSet.activateCompo(this.name, this.setPosition);}
            })
            .catch((error)=>{
                console.log('error', error);
            });

    }

    /**
     * activate the fair metrics and accuracies of the final project
     */
    activateFinal(){
        if(this.VCSet){
            let FairAccFCom = this.VCSet.findVC('FairAccF', this.setPosition-1);
            let FairMetricsFCom = this.VCSet.findVC('FairMetricsF', this.setPosition-1);
            if(FairAccFCom){
                FairAccFCom.activate();}
            if(FairMetricsFCom){
                FairMetricsFCom.activate();}
        }
    }

    /**
     * set train style
     * hightlight train div, model div, line between them, titles
     * reset the test style
     */
    trainStyle(){
        // reset test
        this.testDiv.classed('div-highlight', false);       
        this.testDiv.select('.plotTitle').style('color', null);
        this.modelDiv.classed('highlightModelDiv', false);
        this.testButton.classed('LREButtonHighlight', false);
        this.evalModelLine.classed('arrowLine-highlight', false);
        this.predictModelLine.classed('arrowLine-highlight', false);
        this.modelCNTsvg.select(`#testArrowheadId-${this.identifier}`).select('path').style('fill', null);

        this.trainDiv.classed('div-highlight', true);       
        this.trainDiv.select('.plotTitle').style('color', this.highlightColor);
        this.modelCNTsvg.select(`#trainArrowheadId-${this.identifier}`).select('path').style('fill', this.highlightColor);
        this.trainButton.classed('LREButtonHighlight', true);
        this.trainModelLine.selectAll('line').classed('arrowLine-highlight', true);
        this.modelDiv.select('.plotTitle').style('color', this.highlightColor);
        this.outputDiv.selectAll('div').style('opacity', '0');
        this.colorMapDiv.selectAll('*').remove();
        this.outputDiv.select('.plotTitle').style('color', null);
        this.outputDiv.style('border-color', null);
        this.outputDiv.style('border-style', 'dashed');
    }
   /**
     * set test style
     * hightlight test div, model div, line between them, titles
     * reset the test style
     */
    testStyle(){
        this.trainDiv.classed('div-highlight', false);    
        this.trainDiv.select('.plotTitle').style('color', null);
        this.modelCNTsvg.select(`#trainArrowheadId-${this.identifier}`).select('path').style('fill', null);
        this.trainButton.classed('LREButtonHighlight', false);
        this.trainModelLine.selectAll('line').classed('arrowLine-highlight', false);

        // highlight test part
        this.testDiv.classed('div-highlight', true);    
        this.testDiv.select('.plotTitle').style('color', this.highlightColor);
        this.modelDiv.classed('highlightModelDiv', true);
        this.testButton.classed('LREButtonHighlight', true);
        this.evalModelLine.classed('arrowLine-highlight', true);
        this.predictModelLine.classed('arrowLine-highlight', true);
        this.modelCNTsvg.select(`#testArrowheadId-${this.identifier}`).select('path').style('fill', this.highlightColor);
        this.outputDiv.select('.plotTitle').style('color', this.highlightColor);
        this.outputDiv.classed('div-highlight', true);    
    }


    /**
     * when training is in progress show the text: Model is training (about )...
     */
    trainingReminder(){
        let i = 0;
        let str = '';
        let that = this;
        function showTrainReminder(){
            i += 1;
            i %= 3;
            if(i==0){
                str = '.  ';
            }
            else if(i==1){
                str = '.. ';
            }
            else if(i==2){
                str = '...';
            }
            // if(that.modelName == 'PrejudiceRmv'){
            //     that.sucReminder.text('Processing'+str);
            // }
            // else{
                that.sucReminder.text('Model is being trained'+str);
            // }
        }
        this.trainTimer = setInterval(showTrainReminder, 500);
    }

    /**
     * when the model is successfully trained
     */
    successReminder(){
        let that = this;
        clearInterval(this.trainTimer);
        this.sucReminder.text('Success, now you can evaluate the model.');
        function clear(){
            that.sucReminder.text('');
            clearTimeout(that.successTimer);
        }
        this.successTimer = setTimeout(clear, 5000);
    }


    /**enable all buttons on this page */
    enableBtns(){
        if(this.trainButton){
            this.trainButton.on('click', ()=>{
                this.trainModel();
            });
        }
        if(this.evalButton && this.modelReady){
            this.evalButton.on('click', ()=>{
                this.testModel();
            });
        }
    }

    /**disable all buttons on this page */
    disableBtns(){
        if(this.trainButton){
            this.trainButton.on('click', null);
        }
        if(this.evalButton){
            this.evalButton.on('click', null);
        }
    }

}