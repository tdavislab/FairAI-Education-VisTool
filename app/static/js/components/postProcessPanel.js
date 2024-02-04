/**
 * preprocessing Panel
 */

 class PostProcessPanel{
    /** 
     * @param {*} templateId 
     * @param {*} type  ROC
     */
    constructor(templateId, type, setPosition, VCSet){
        // properties of postprocessing modular
        this.name = 'PostProcess';
        this.type = type;
        this.setPosition = setPosition;
        this.VCSet = VCSet;

        // clone div
        const visualComponentNode = document.getElementById(templateId);
        const cloneNode = visualComponentNode.content.cloneNode(true).querySelector('.visualComponentContainer');
        document.getElementById('contentDiv').appendChild(cloneNode);
        d3.select(cloneNode).classed('newVisualComponent', true);

        // div
        this.containerSelector = d3.select(cloneNode);
        this.colorMapDiv = this.containerSelector.select('.colorMapDiv');
        this.originalOutputDiv = this.containerSelector.select('.originalOutputDiv');
        this.debiasedOutputDiv = this.containerSelector.select('.debiasedOutputDiv');
        this.processBtnContainer = this.containerSelector.select('.processBtnContainer');
        this.processBtn = this.processBtnContainer.select('.processBtn');

        this.reminder = '';

        // data
        this.confusionMatrixData = '';
        this.accuracy = '';
        this.lastConfusionMatrixData = '';
        this.lastAccuracy = '';
        this.CFScale = '';
        this.opacityScale = '';

        // settingUp
        this.arrowColor = '#777777';

        this.activate();
    }

    /**
     * 1. draw the arrow and button
     * 2. render the original output
     * 3. style the debiased output 
     */
    async activate(){
        this.drawBtnArrow();
        
        // get the original prediction
        await axios.post('/getMetrics', {
            type: 'Original',
            inSet: -1
        })
        .then((response)=>{
            this.lastConfusionMatrixData = response.data['CF'];
            this.lastAccuracy = response.data['accuracy'];
        })
        .catch((error)=>{
            console.log(error);
        });
        // calculate the color scale
        let maxValue = d3.max(this.lastConfusionMatrixData.flat(3));
        maxValue = (parseInt(maxValue/10)+1)*10;
        this.CFScale = d3.scaleLinear().domain([0, maxValue])
            .range(['rgba(91, 155, 213, 0.2)', 'rgba(91, 155, 213, 1)']);
        this.opacityScale = d3.scaleLinear().domain([0, maxValue])
            .range([0.2, 1]);
        // visualize the original output
        visOutputPanel(this.originalOutputDiv, {'data': this.lastConfusionMatrixData, 'accuracy': this.lastAccuracy}, this.colorMapDiv, this.CFScale, this.opacityScale);
        // make style the final output div
        this.debiasedOutputDiv.selectAll('div').style('opacity', '0');
        this.debiasedOutputDiv.select('.plotTitle').style('color', null);
        this.debiasedOutputDiv.style('border-color', null);
        this.debiasedOutputDiv.style('border-style', 'dashed');
    }

    // load the data after postprocessing
    async getProcessedData(){
        // disable buttons
        this.processBtn.on('click', null);
        this.processReminder();
        await axios.post('/getPostprocessData', {
            'type': this.type
        })
        .then((response)=>{
            // enable buttons
            // enableChapterBtns();
            clearInterval(this.processTimer);
            if(this.reminder){
                this.reminder.text('');
            }
            this.debiasedOutputDiv.selectAll('div').style('opacity', '1');
            this.debiasedOutputDiv.style('border-style', 'solid');
            this.confusionMatrixData = response.data['data'];    // update the confusion matrix data
            if(this.VCSet){this.VCSet.data.confusionMatrixData = this.confusionMatrixData;}
            
            this.accuracy = response.data['accuracy'];
            
            // render the output after post-processing
            let maleM = this.confusionMatrixData[0];
            let maleML = this.lastConfusionMatrixData[0];
            let femaleM = this.confusionMatrixData[1];
            let femaleML = this.lastConfusionMatrixData[1];
            let malePredChange = [maleM[0][0]+maleM[1][0]-maleML[0][0]-maleML[1][0], maleM[0][1]+maleM[1][1]-maleML[0][1]-maleML[1][1]];
            let femalePredChange = [femaleM[0][0]+femaleM[1][0]-femaleML[0][0]-femaleML[1][0], femaleM[0][1]+femaleM[1][1]-femaleML[0][1]-femaleML[1][1]];
            let accChange = this.accuracy-this.lastAccuracy;
            visOutputPanel(this.debiasedOutputDiv, {data: this.confusionMatrixData, accuracy: this.accuracy}, '', 
            this.CFScale, this.opacityScale, accChange, malePredChange, femalePredChange);

            // activate the fairness metrics
            if(this.VCSet){
                this.VCSet.activateCompo(this.name, this.setPosition);
            }

            // enable the button
            this.processBtn.on('click', ()=>this.getProcessedData());
        })
        .catch((error)=>{
            console.log(error);
        });
    }

    // draw the button and arrow
    drawBtnArrow(){
        // dim
        let width = parseFloat(this.processBtnContainer.style('width'));
        let height = parseFloat(this.processBtnContainer.style('height'));
        let btnWid = parseFloat(this.processBtn.style('width'));
        let btnHei = parseFloat(this.processBtn.style('height'));

        // place the button and add listner
        this.processBtn
            .style('top', `${height/2-btnHei-2}px`)
            .style('left', `${width/2-btnWid/2}px`)
            .on('click', ()=>this.getProcessedData());

        // visualize the arrow
        let svg = this.processBtnContainer.append("svg")
            .attr("width", '100%')
            .attr("height", '100%')
            .attr("viewBox", `0 0 ${width} ${height}`);
        let ArrowG = svg.append("g");
        ArrowG.append("defs")
            .append("marker")
            .attr("id", "arrowhead")
            .attr("markerWidth", 13)
            .attr("markerHeight", 13)
            .attr("refX", "0")
            .attr("refY", 3)
            .attr("orient", "auto")
            .attr("markerUnits","strokeWidth")
            .attr("stroke-width","13")
            .append("path").attr("d", "M0,0 L0,6 L9,3 z").attr("fill", this.arrowColor);
        let arrow_height = 6.5;
        ArrowG.append("line")
            .attr("marker-end", "url(#arrowhead)")
            .attr("x1", 0)
            .attr("y1", height/2)
            .attr("x2", width-arrow_height)
            .attr("y2", height/2)
            .attr("stroke", this.arrowColor);
        // add the reminder div
        this.reminder = this.processBtnContainer.append('div')
            .classed("trainTest-reminder", true)
            .style("width", `${width-10}px`)
            .style('left', (10/2)+"px")
            .style('top', `${height/2}px`);
    }


    processReminder(){
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
           
            that.reminder.text('Processing'+str);
        }
        // return new Promise(resolve => setTimeout(showTrainReminder, 10));
        this.processTimer = setInterval(showTrainReminder, 500);
    }


    /**enable all buttons on this page */
    enableBtns(){
        if(this.button){
            this.button.on('click', ()=>this.getProcessedData());
        }
    }

    /**disable all buttons on this page */
    disableBtns(){
        if(this.button){
            this.button.on('click', null);
        }
    }

}