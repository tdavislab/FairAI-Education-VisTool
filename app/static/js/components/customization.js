/**
 * This script is used to Generate the edit panel
 */
class EditPanel{
    /**
     * @param {*} infoData the number and features of raw data; 
     * @param {*} setPosition num; If this visual component belongs to a Visual set, num represents the position of this VC in this set' otherwise -1
     * @param {*} VCSet object; If this visual component belongs to a Visual set, then VCSet represent the object, otherwise ''
     */
    constructor(templateId, setPosition, VCSet){
        this.name = 'customization';     // the name of this kind of visual component
        this.setPosition = setPosition;
        this.VCSet = VCSet;
        // clone the div
        const visualComponentNode = document.getElementById(templateId);
        const cloneNode = visualComponentNode.content.cloneNode(true).querySelector('.visualComponentContainer');
        // add the clone div into the webpage
        document.getElementById('contentDiv').appendChild(cloneNode);
        // reveal the div only if setPosition == -1 or 0
        d3.select(cloneNode).classed('newVisualComponent', true) // 'newVisualComponent' as a label for future removal
            .attr('display', setPosition==0||setPosition==-1? 'none':'block');

        // selectors
        this.customizationDiv = d3.select('.customization');    // the entire div
        this.editPanelDiv = this.customizationDiv.select('.editPanel');     // left div
        this.inputPanel = this.customizationDiv.select('.inputPanel');   // right div

        // data of this visual component
        this.dataInfo = '';     // {raw_data_features: ['gender', 'employment', 'dependents', 'age', 'amount'], raw_data_num: 400}
        this.selectedFeatureLst = '';
        this.trainData = '';
        this.testData = '';
        this.activate();
    }

    /**
     * 1. get the data info from backend (feature list, num)
     * 2. undate the global variable dataNum, and yScale
     * 3. visualize all features
     */
    async activate(){
        await axios.post('/getDataInfo')
            .then((response)=>{
                this.dataInfo = response.data;
                this.selectedFeatureLst = this.dataInfo.raw_data_features;
                dataNum = this.dataInfo.raw_data_num;
                initYScale();
            })
            .catch((error)=>{
                console.log(error);
            });
        this.initFeaturePanel();
        this.initActions();
    }

    // draw all features in the featurePanel
    initFeaturePanel(){
        let featureDiv = this.editPanelDiv.select('.features');
        let addFeatureIcon = (featureName)=>{
            featureDiv.append('button')
                .attr('type', 'button')
                .attr('class', 'featureBtn')
                .attr('id', featureName+'Btn')
                .text(featureName)
                .on('click', ()=>this.clickFetureIcon(featureName));
        };
        this.dataInfo['raw_data_features'].forEach(featureName => {
            addFeatureIcon(featureName);
        });
    }

    /**
     * 1. add listener on the range bar
     * 2. add listener on the submit button
     */
    initActions(){
        // once change the range bar, update the train/test ratio
        this.customizationDiv.select('.rangeBar')
            .on('input', ()=>{
                let trainRatio = this.editPanelDiv.select('#ttRatio').node().value;
                let testRatio = 100 - trainRatio;
                this.editPanelDiv.select('ratioNum').text(`${trainRatio}% : ${testRatio}%`);
            });
        // submit button
        this.editPanelDiv.select('.submitBtn')
            .on('click', ()=>{this.clickSubmitBtn()});
    }

    // click on a feture icon, then modify the selectedFeatureLst
    clickFetureIcon(featureName){
        // judge whether or not  this feature has been selected
        let index = this.selectedFeatureLst.indexOf(featureName);
        // insert/delete a feature
        if(index>-1){
            if(this.selectedFeatureLst.length==1){
                alert('Please select at least one feature!');
            }
            else{
                // deselected
                this.selectedFeatureLst.splice(index, 1);
                d3.select(`#${featureName}Btn`)
                    .classed('unselected', true);
            }
        }
        else{
            // selected
            this.selectedFeatureLst.push(featureName);
            d3.select(`#${featureName}Btn`)
                .classed('unselected', false);
        }
    }

    // click on the submit button, then send the form data to the backend
    clickSubmitBtn(){
        // 0. disable all buttons on this page
        // disableChapterBtns();
        // get all form data
        let formData = {};
        formData.number = 1;
        formData.features = this.selectedFeatureLst;
        formData.sensitiveAttr = this.editPanelDiv.select('#sAttr').node().value;
        formData.ratio = parseInt(this.editPanelDiv.select('#ttRatio').node().value)/100;

        axios.post('/getTrainTest', formData)
            .then((response)=>{
                this.trainData = response.data['train'];
                this.testData = response.data['test'];
                // enableChapterBtns(); // enable all buttons
                this.inputPanel.style('visibility', 'visible'); // set input panel visible
                // 1. style the legend
                styleLegend(this.inputPanel.select('.legendDiv'));
                // 2. add train div
                visTrainOrTestData(this.inputPanel.select('.trainDataDiv'), this.trainData, 'Training Data');
                visTrainOrTestData(this.inputPanel.select('.testDataDiv'), this.testData, 'Test Data');
                // activate the Macnine Learning panel if applicable
                if(this.VCSet){
                    this.VCSet.data.trainData.Original = this.trainData;
                    this.VCSet.data.testData = this.testData;
                    this.VCSet.activateCompo(this.name, this.setPosition);
                }
            })
            .catch((error)=>{
                console.log(error);
            });
    }

    /**enable all buttons on this page */
    enableBtns(){
        let buttonSelector = this.editPanel.select('#editButton');
        if(!buttonSelector.empty()){
            buttonSelector.on('click', ()=>{this.clickEditSubmit()});
        }
    }

    /**disable all buttons on this page */
    disableBtns(){
        let buttonSelector = this.editPanel.select('#editButton');
        if(!buttonSelector.empty()){
            buttonSelector.on('click', null);
        }
    }

}