/**
 * This class is used to genarate the fairness metrics container to display the four firness metrics
 */
class FairMetricsPanel{
    /**
     * new a panel
     * @param {*} containerId the div id of the mostout div
     * @param {*} metricsData the values of different fairness metrics
     * {'SPD': [{'original': 0.95}, {'mitigate': 0.2}...], 'DI': [{'original': 0.95}, {'mitigate': 0.2}...], 
     * 'EOD': , 'AOD': , 'accuracy': [{'original': 0.95}, {'mitigate': 0.2}]}
     * type: 'Original', 'Reweighing'....
     * metricsLst: ['SPD', 'DI', 'EOD', 'AOD'] shown metrics
     * interaction: 'True' / 'False'
     */
    constructor(templateId, type, metricsLst, interaction, setPosition, VCSet){
        this.name = 'FairMetrics';
        this.setPosition = setPosition;
        this.VCSet = VCSet;
        this.type = type;
        this.interaction = interaction=='True'? true:false;

        //clone the div
        const visualComponentNode = document.getElementById(templateId);
        this.cloneNode = visualComponentNode.content.cloneNode(true).querySelector('.visualComponentContainer');
        document.getElementById('contentDiv').appendChild(this.cloneNode);
        d3.select(this.cloneNode).classed('newVisualComponent', true) // 'newVisualComponent' as a label for future removals
            .style('display', 'none'); // reveal the div only if setPosition == -1 or 0
        
        //div selectors
        this.fairMetricsDiv = d3.select(this.cloneNode).select('.fairMetrics');  
        this.CMContainerDiv = this.fairMetricsDiv.select('.CMContainer');   // confusion matrix container
        this.formulaContainerDiv = this.fairMetricsDiv.select('.formulaContainer');     // formula container
        this.metricsContainerDiv = this.fairMetricsDiv.select('.metricsContainer');     // metrics container
        // the div containing the fomula
        this.feFormulaDiv = this.formulaContainerDiv.select('.feFormulaDiv');     // the female group
        this.maleFormulaDiv = this.formulaContainerDiv.select('.maleFormulaDiv');   // male group
        this.minusDiv = this.formulaContainerDiv.select('.minusDiv');          //minus
        this.equalDiv = this.formulaContainerDiv.select('.equalDiv');         // equal to

        // data in this VC
        this.confusionMatrixData = '';
        // fairness metrics to be shown in this modular
        this.shownMetrics = metricsLst;
        this.focusMetric = '';    // the focused metric

        // the div clicked last time
        this.lastClickDiv = '';

        // if the fairness metric is single, we directly activate
        if(this.setPosition==-1){this.activate();}
    }

    /**
     * when the prediction data is avaliable, activate the corresponding fairness metrics
     * 1. get the confusion matrix data
     * 2. render the confusion matrix container
     * 3. render the fairness metrics
     */
    async activate(){
        this.reset();
        d3.select(this.cloneNode).style('display', 'block');
        // 1. get the confusion matrix data 
        if(this.VCSet){ this.confusionMatrixData = this.VCSet.data.confusionMatrixData;}
        await axios.post('/getMetrics', {
            type: this.type,
            inSet: this.setPosition
        })
        .then((response)=>{
            this.metricsData = response.data;
            // if this is the single VC
            if(this.setPosition == -1){
                this.confusionMatrixData = this.metricsData['CF'];
            }
        })
        .catch((error)=>{
            console.log(error);
        });

        // 2. render the confusion matrix
        this.initCMDiv();

        // 3. add and visualize different metric panels
        this.metricsContainerDiv.selectAll('*').remove();
        this.shownMetrics.forEach((metricName)=>{
            this.addFairMetricDiv(metricName);
        });
    }

    // render the confusion matrix container
    initCMDiv(){
        let CFData = this.confusionMatrixData;
        const colorMapDiv = this.CMContainerDiv.select('.colorMapDiv');
        const previlageCF = this.CMContainerDiv.select('.previlageCF');
        const unprevilageCF = this.CMContainerDiv.select('.unprevilageCF');
        // remove them id there are something inside
        colorMapDiv.selectAll('*').remove();
        previlageCF.selectAll('*').remove();
        unprevilageCF.selectAll('*').remove();
        
        // get the color scale
        let maxValue = d3.max(CFData.flat(3));
        maxValue = (parseInt(maxValue/10)+1)*10;
        const CFScale = d3.scaleLinear().domain([0, maxValue])
            .range(['rgba(91, 155, 213, 0.2)', 'rgba(91, 155, 213, 1)']);
        const opacityScale = d3.scaleLinear().domain([0, maxValue])
            .range([0.2, 1]);
        // visualize the colormap div
        addColorLegend(colorMapDiv, this.name+'_colorBar', CFScale, false);
        // visualize the 2 confusion matrices 
        visConfusionMatrixPanel(unprevilageCF, CFData[1], 1, this.interaction, opacityScale, this);
        visConfusionMatrixPanel(previlageCF, CFData[0], 0, this.interaction, opacityScale, this);
        this.CMContainerDiv.selectAll('.CMTitleFont').style('font-family', 'font1')
    }

    /**
     * add and render a fairness metric div
     */
    addFairMetricDiv(metricName){
        let divSelector = this.metricsContainerDiv.append('div')
            .classed('fairMetricDiv', true)
            .classed(metricName+'Panel', true);
        visFairMetricPanel(divSelector, metricName, this.metricsData[metricName]);
        divSelector.on('click', ()=>{
            this.clickEvent(divSelector);
        });
    }

    /**
     * click on this specific metric div
     * @param {*} divSelector 
     */
    clickEvent(divSelector){
        let metricName = divSelector.property('name');
        let color = '#E06666';  // red
        let clear = false;

        // function for adding the area border
        let addAreaBorder = (x, y, width, height) => {
            let group = this.CMContainerDiv.selectAll('.rects');
            group.append('rect').classed('areaBorder', true)
                .attr('x', x).attr('y', y)
                .attr('width', width)
                .attr('height', height)
                .attr('stroke', color)
                .attr('fill', 'none');
        }

        if(this.lastClickDiv){
            // lastclickdiv exists, now click on another one
            if(metricName != this.lastClickDiv.property('name')){
                this.clickEvent(this.lastClickDiv);
                this.focusMetric = metricName;
                this.lastClickDiv = divSelector;
                divSelector.style("border", `solid 2px ${color}`);
                divSelector.selectAll('.lastMetric').style('fill', color).style('stroke', color);
            }
            // click on the same one
            else{
                this.focusMetric = '';
                this.lastClickDiv = '';
                divSelector.style("border", 'solid 1px #dadce0');  
                divSelector.selectAll('.lastMetric').style('fill', null).style('stroke', null);
                color = null;
                clear = true;
            }
        }
        else{
            this.focusMetric = metricName;
            this.lastClickDiv = divSelector;
            divSelector.style("border", `solid 2px ${color}`);
            divSelector.selectAll('.lastMetric').style('fill', color).style('stroke', color);
        }
        
        if(metricName == 'SPD' || metricName == 'DI'){
            this.CMContainerDiv.selectAll('.TP').style('fill', color);
            this.CMContainerDiv.selectAll('.FP').style('fill', color);
            addAreaBorder(0, 0, CMDim.rectWid*2, CMDim.rectHei*2);
        }
        else if(metricName == 'EOD'){
            this.CMContainerDiv.selectAll('.TP').style('fill', color);
            addAreaBorder(0, 0, CMDim.rectWid*2, CMDim.rectHei);
        }
        else if(metricName == 'AOD'){
            this.CMContainerDiv.selectAll('.TP').style('fill', color);
            this.CMContainerDiv.selectAll('.FP').style('fill', color);
            addAreaBorder(0, 0, CMDim.rectWid*2, CMDim.rectHei);
            addAreaBorder(0, CMDim.rectHei, CMDim.rectWid*2, CMDim.rectHei);
        }
        this.addFomula(metricName);
        // this.formulaContainerDiv
        //     .style("visibility", "visible")
        //     .style("height", "50px");

        if(clear){
            this.CMContainerDiv.selectAll('.areaBorder').remove();
            this.formulaContainerDiv.style("display", "none"); // make this panel appear
            this.focusMetric = '';
        }
        else{
            this.addFomula(metricName);
        }
    }
 
    // add the formula part 
    /*[ [[true_positive, False_negative], [False_positive, true_negative]],
        [[true_positive, False_negative], [False_positive, true_negative]] ], */
    addFomula(metricName){
        this.formulaContainerDiv.style("display", "grid"); // make this panel appear
        let metricValue = Object.values(this.metricsData[metricName][this.metricsData[metricName].length-1])[0];
        let mTP = this.confusionMatrixData[0][0][0];
        let mFP = this.confusionMatrixData[0][1][0];
        let mFN = this.confusionMatrixData[0][0][1];
        let mTN = this.confusionMatrixData[0][1][1];
        let fTP = this.confusionMatrixData[1][0][0];
        let fFP = this.confusionMatrixData[1][1][0];
        let fFN = this.confusionMatrixData[1][0][1];
        let fTN = this.confusionMatrixData[1][1][1];
        
        if(metricName == 'SPD' || metricName == 'DI'){
            this.feFormulaDiv.text(`$\\frac{${fTP}+${fFP}}{${fTP}+${fFP}+${fFN}+${fTN}}$`);
            this.maleFormulaDiv.text(`$\\frac{${mTP}+${mFP}}{${mTP}+${mFP}+${mFN}+${mTN}}$`);
            if(metricName == 'SPD'){
                this.minusDiv.text('$-$');
            }
            else{
                this.minusDiv.text('$/$');
            }
        }
        else if(metricName == 'EOD'){
            this.feFormulaDiv.text(`$\\frac{${fTP}}{${fTP}+${fFN}}$`);
            this.maleFormulaDiv.text(`$\\frac{${mTP}}{${mTP}+${mFN}}$`);
            this.minusDiv.text('$-$');
        }
        else if(metricName == 'AOD'){
            this.minusDiv.text('$-$');
            this.feFormulaDiv.text(`$\\frac{\\frac{${fTP}}{${fTP}+${fFN}}+\\frac{${fFP}}{${fFP}+${fTN}}}{2}$`);
            this.maleFormulaDiv.text(`$\\frac{\\frac{${mTP}}{${mTP}+${mFN}}+\\frac{${mFP}}{${mFP}+${mTN}}}{2}$`);
        }
        this.equalDiv.text(`$=${metricValue}$`).classed('formulaText', true);  
        MathJax.typeset();
    }

    // reset
    reset(){
        // this.containerSelector.style('display', 'block').style('height', '110px');
        // this.containerSelector.selectAll('*').remove();
    }

    /**
     * update the confusion matrix
     * @param {*} confusion new confusion matrix
     * @param {*} idx the idx, 0 or 1
     */
    update(CM, idx){
        this.confusionMatrixData[idx] = CM;     // new confusion matrix
        // update the metricsData
        let metricsData = {}
        this.shownMetrics.forEach(metricName=>{
            metricsData[metricName] = [];
            let lastVal = Object.values(this.metricsData[metricName][this.metricsData[metricName].length-1])[0];
            let currentVal = this.calcuteMetrics(metricName);
            metricsData[metricName].push({'Previous': lastVal});
            metricsData[metricName].push({'Current': currentVal});
            if(metricName == 'DI'){
                // check the result
                let gap = d3.max([Math.abs(lastVal-1), Math.abs(currentVal-1)]);
                let currentGap = fairMetricInfo['DI'].range[1]-1;
                let newGap = currentGap;
                if(gap>currentGap){newGap=parseInt(gap)+1;}
                else if(gap < 1.5){newGap=1.5}
                fairMetricInfo['DI'].range = [1-newGap, 1+newGap];
            }
            // update the visualization
            visFairMetricPanel(this.metricsContainerDiv.select('.'+metricName+'Panel'), metricName, metricsData[metricName]);
        });
        //hilight the focused click  
        this.metricsData = metricsData;
        // update formula
        if(this.focusMetric){this.addFomula(this.focusMetric);}
    }

    calcuteMetrics(metricName){
        let val = '';
        let mTP = this.confusionMatrixData[0][0][0];
        let mFP = this.confusionMatrixData[0][1][0];
        let mFN = this.confusionMatrixData[0][0][1];
        let mTN = this.confusionMatrixData[0][1][1];
        let fTP = this.confusionMatrixData[1][0][0];
        let fFP = this.confusionMatrixData[1][1][0];
        let fFN = this.confusionMatrixData[1][0][1];
        let fTN = this.confusionMatrixData[1][1][1];
        
        if(metricName == 'SPD' || metricName == 'DI'){
            let femaleVal = (fTP+fFP)/(fTP+fFP+fFN+fTN);
            let maleVal = (mTP+mFP)/(mTP+mFP+mFN+mTN);
            val = metricName == 'SPD'? femaleVal-maleVal:femaleVal/maleVal;
        }
        else if(metricName == 'EOD'){
            val = fTP/(fTP+fFN) - mTP/(mTP+mFN)
        }
        else if(metricName == 'AOD'){
            val = (fTP/(fTP+fFN)+fFP/(fFP+fTN))/2 - (mTP/(mTP+mFN)+mFP/(mFP+mTN))/2
        }
        return val.toFixed(2);
    }
}