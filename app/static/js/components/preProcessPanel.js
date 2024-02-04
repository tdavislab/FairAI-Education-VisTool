/**
 * preprocessing Panel
 */

class PreProcessPanel{
    /** 
     * @param {*} containerSelector 
     * @param {*} type 'Reweighing', 'LFR', 'OptimPreproc'
     */
    constructor(templateId, type, setPosition, VCSet){
        // properties of this modular
        this.name = "PreProcess";
        this.setPosition = setPosition;
        this.VCSet = VCSet;
        this.type = type;

        // clone the template
        const visualComponentNode = document.getElementById(templateId);
        const cloneNode = visualComponentNode.content.cloneNode(true).querySelector('.visualComponentContainer');
        document.getElementById('contentDiv').appendChild(cloneNode);
        d3.select(cloneNode).classed('newVisualComponent', true);

        // div selector
        this.containerSelector = d3.select(cloneNode);
        this.originalTrainContainer = this.containerSelector.select('.originalTrainContainer')
        this.originalTrainDiv = this.originalTrainContainer.select('.originalTrainDiv');
        this.debiasedTrainDiv = this.containerSelector.select('.debiasedTrainDiv');
        this.processBtnContainer = this.containerSelector.select('.processBtnContainer');
        // button
        this.processBtn = this.processBtnContainer.select('.processBtn');

        // data
        this.trainData = '';
        this.deBiasedTrainData = '';
        
        this.reminder = '';

        // settingUp
        this.arrowColor = '#777777';

        if(this.setPosition == -1 || this.setPosition == 0){
            this.activate();    // activate this modular when it is a single modular or the first in a VC set
        }
    }

    /**
     * activate the pre-processing component
     * 1. get the train data from backend if necessary
     * 2. render the original train div and the legend
     * 3. render the debiased train div (dasehed)
     * 4. render the button div
     */
    async activate(){
        // get the original train data
        await axios.post('/startDebias')
            .then((response)=>{
                this.trainData = response.data['train'];
                // if in VCSet, save it to the VC set data area
                if(this.VCSet){
                    this.VCSet.data.trainData.Original = this.trainData;
                    this.VCSet.data.testData = response.data['test'];
                }
            })
            .catch((error)=>{
                console.log(error);
            });

        // render the train div and debiased train div
        styleLegend(this.originalTrainContainer.select('.legendDiv'));
        visTrainOrTestData(this.originalTrainDiv, this.trainData, 'Training Data', undefined);
        visTrainOrTestData(this.debiasedTrainDiv, this.trainData, 'Training Data after '+this.type, undefined)
            .classed('nullState', 'true')    // the initial state of the debiased train data div
            .select('svg')
            .remove();
        // render the button and the arrow
        this.drawBtnArrow();
    }
    
    // draw the button and arrow
    drawBtnArrow(onlyBtn=false){
        this.processBtn.text(this.type);
        // dim
        let width = parseFloat(this.processBtnContainer.style('width'));
        let height = parseFloat(this.processBtnContainer.style('height'));
        let btnWid = parseFloat(this.processBtn.style('width'));
        let btnHei = parseFloat(this.processBtn.style('height'));

        // place the button and add listner
        this.processBtn
            .style('bottom', `${height/2+3}px`)
            .style('left', `${width/2-btnWid/2}px`)
            .on('click', ()=>this.getProcessedData());
        if(onlyBtn){
            return;
        }
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
            .attr("x2", width-arrow_height-3)
            .attr("y2", height/2)
            .attr("stroke", this.arrowColor);
        // add the reminder div
        this.reminder = this.processBtnContainer.append('div')
            .classed("trainTest-reminder", true)
            .style("width", `${width-10}px`)
            .style('left', (10/2)+"px")
            .style('top', `${height/2}px`);
    }

    // load the data after preprocessing
    async getProcessedData(){
        // 0. disable all btns at this chapter
        // disableChapterBtns();
        this.processBtn.on('click', null);

        this.processReminder();
        await axios.post('/getPreprocessData', {'type': this.type})
        .then((response)=>{
            let data = response.data;
            // enable all btns at this chapter
            clearInterval(this.processTimer);
            if(this.reminder){
                this.reminder.html('');
            }
            // if in a set then save the processed train data into the VCset
            if(this.VCSet){this.VCSet.data.trainData[this.type] = data;}
            if(this.type == 'Reweighing'){
                this.deBiasedTrainData = data;
                if(this.VCSet){this.VCSet.data.trainData[this.type] = this.deBiasedTrainData;} // we only store the weights of groups
                visTrainOrTestData(this.debiasedTrainDiv, this.trainData, 'Training Data after '+this.type, this.deBiasedTrainData);
            }
            else if(this.type == 'LFR'){
                this.deBiasedTrainData = data['train'];
                if(this.VCSet){
                    this.VCSet.data.trainData[this.type] = this.deBiasedTrainData;
                    this.VCSet.data.testData = data['test'];
                }
                visTrainOrTestData(this.debiasedTrainDiv, this.deBiasedTrainData, 'Training Data after '+this.type, '');
            }
            else if(this.type == 'OptimPreproc'){
                this.deBiasedTrainData = data['train'];
                if(this.VCSet){
                    this.VCSet.data.trainData[this.type] = this.deBiasedTrainData;
                    this.VCSet.data.testData = data['test'];
                }
                visTrainOrTestData(this.debiasedTrainDiv, this.deBiasedTrainData, 'Training Data after '+this.type, '');
            }
            // render the dataset
            this.debiasedTrainDiv
                .style('background', 'white')
                .style('border-style', 'solid');
            
            // replace the button
            this.drawBtnArrow(true);
            
            // if index != -1, then activate ML pipeline
            if(this.setPosition > -1){
                this.VCSet.data.trainData.Reweighing = this.deBiasedTrainData;
                this.VCSet.activateCompo(this.name, this.setPosition);
            }
            // restore the buttons
            this.processBtn.on('click', ()=>this.getProcessedData());
        })
        .catch((error)=>{
            console.log(error);
        });
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
            // if(that.type == 'OptimPreproc' || that.type == 'LFR'){
            //     that.reminder.html('Be patient, this process may take 10s'+str);
            // }
            // else{
                that.reminder.html('Processing'+str);
            // }
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