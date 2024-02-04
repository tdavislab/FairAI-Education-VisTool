// global variables / functions
// datasetInfo

// visualVariable
const labelText = {positive: 'Approve', negative: 'Deny'};
const groupsText = ['Male', 'Female'];
let isFinalProject = false;  // we use different dataset for the final project, need to have different scales
let dataNum = 400;   // the total number of train/test data, by default, it is 400
let YAxisScale = '';    // the Y axis scale of train/test data chart


// dimension variables 
// train/test data div unit: vw
const ttdivDim = {
    width: 15,  // the same with CSS
    padding:{
        left: 1,
        right: 1,
        top: 1,
        bottom: 1.5
    }
};
// the dimension for the confusion matrix
let CMDim = 0;  // init it in the visualize confusion matrix function
// fairness metrics information
const fairMetricInfo = {
    'SPD': {fullName: 'Statistical Parity Difference', range: [-1, 1], fair: 0},
    'DI': {fullName: 'Disparate Impact', range: [-0.5, 2.5], fair: 1},
    'EOD': {fullName: 'Equal Opportunity Difference', range: [-1, 1], fair: 0},
    'AOD': {fullName: 'Average Odds Difference', range: [-1, 1], fair: 0}
};

/**
 * initialize Y axis scale according to dataNum
 * call this method when get the dataNum 
 */
function initYScale(){
    let totalHeight = 35;   // unit wv
    YAxisScale = d3.scaleLinear().domain([0, dataNum]).range([0, totalHeight]);
}

/**
 * convert vw to px; used in drawing the arrows
 * @param {*} vw 
 */
function vwTopx(vw){
    vw = parseFloat(vw);
    return document.documentElement.clientWidth/100*vw;
}
  
/**
 * style the postive/negative legend (on the right top of train/test data div)
 *  1. change the color of rectangulars
 *  2. modify the text
 * @param {*} legendDiv
 */
function styleLegend(legendDiv){
    legendDiv.select('.positiveIcon').style('background-color', colorMap.orange);
    legendDiv.select('.negativeIcon').style('background-color', colorMap.blue);
    legendDiv.select('.positiveText').text(isFinalProject? 'Yes': labelText.positive);
    legendDiv.select('.negativeText').text(isFinalProject? 'No': labelText.negative);
}

/**
 * visualize the train or test panel as bar chart
 * @param {*} divSelector  the selector
 * @param {*} data  [[male_positive, male_negative], [female_positive, female_negative]]
 * @param {*} title  'Train Data'/'Test Data'
 * @param {*} weights weights for [[male_positive, male_negative], [female_positive, female_negative]]
 */
 function visTrainOrTestData(divSelector, data, title, weights=undefined){
    // clear
    divSelector.select('svg').remove();
    if(!YAxisScale){initYScale();}  // when first load pre-processing, no YScale.
    if(isFinalProject){
        YAxisScale = d3.scaleLinear().domain([0, 5000]).range([0, 50]);
    }
    else{
        YAxisScale = d3.scaleLinear().domain([0, 400]).range([0, 35]);
    }
    // change the title
    divSelector.select('.plotTitle').text(title);
    
    const hasWeight = weights? true:false;
    weights = hasWeight? weights:[[1, 1], [1, 1]];
    const Rdata = hasWeight? [[data[0][0]*weights[0][0], data[0][1]*weights[0][1]], [data[1][0]*weights[1][0], data[1][1]*weights[1][1]]]:data;
    // calculate and set the div's height
    let maxValue = d3.max([...Rdata[0], ...Rdata[1]]);
    let innerHeight = YAxisScale(maxValue);
    let height = ttdivDim.padding.top + ttdivDim.padding.bottom + innerHeight;
    let innerWidth = ttdivDim.width-ttdivDim.padding.left-ttdivDim.padding.right;
    divSelector.style('height', `${height}vw`);

    // add svg
    const svg = divSelector.append('svg').style('width', `${ttdivDim.width}vw`).style('height', `${height}vw`);

    // visualize bars
    let chartsG = svg.append('g').style('transform', `translate(${ttdivDim.padding.left}vw, ${ttdivDim.padding.top}vw)`);
    let scaleY = d3.scaleLinear().domain([0, maxValue]).range([innerHeight, 0]);
    // 



    const scaleX = d3.scaleBand().domain([0, 1]).range([0, innerWidth])
        .paddingInner(0.25).paddingOuter(0.2);
    let bandWidth = scaleX.bandwidth()/2;

    chartsG.selectAll('barsG').data(data)
        .join('g')
        .each(function(d, i){
            // for each group
            let centerX = scaleX(i);
            const visbar = (num, x, label, weight)=>{
                num = num*weight;
                // visualize each bar, text on the bar
                d3.select(this).append('rect').attr('x', `${x}vw`).attr('y', `${scaleY(num)}vw`)
                    .attr('width', `${bandWidth}vw`)
                    .attr('height', `${innerHeight-scaleY(num)}vw`)
                    .attr('fill', label==1? colorMap.orange : colorMap.blue)
                    .attr('border', 'none');
                if(hasWeight){
                    let addText = (pNum, anchor)=>{
                        return d3.select(this).append('text').attr('x', `${x+bandWidth/2}vw`).attr('y', `${scaleY(num)}vw`)
                                .attr('text-anchor', anchor)
                                .attr('dy', '-0.2em')
                                .attr('class', 'barNum')
                                .text(pNum);
                    }
                    addText(parseInt(num/weight), 'end');
                    addText(`x${weight}`, 'start').style('font-weight', 600).classed('barNum', true).style('fill', '#E06666');
                }
                else{
                    // add text label for each bar
                    d3.select(this).append('text').attr('x', `${x+bandWidth/2}vw`).attr('y', `${scaleY(num)}vw`)
                        .attr('text-anchor', 'middle')
                        .attr('dy', '-0.2em')
                        .attr('class', 'barNum')
                        .text(num);
                }
            }
            visbar(d[0], centerX, 1, weights[i][0]);
            visbar(d[1], centerX+bandWidth, 0, weights[i][1]);
            
            // viualize the x-axis label
            d3.select(this).append('text').attr('x', `${centerX+bandWidth}vw`).attr('y', `${innerHeight}vw`)
                .attr('text-anchor', 'middle')
                .attr('class', 'axisTick')
                .attr('dy', '1.2em')
                .text(groupsText[i])
                .attr('class', 'ticks');
        });

    // visualize peripherals 
    chartsG.append('line') 
        .attr('x1', 0)
        .attr('y1', `${innerHeight}vw`)
        .attr('x2', `${innerWidth}vw`)
        .attr('y2', `${innerHeight}vw`)
        .attr('stroke', '#202124').raise();
    
    return divSelector;
}

/*
Visualize the output result including the 1/2 plots and a accuracy panel
{
    'data': [ [[true_positive, False_positive], [False_negative, true_negative]],
    [[true_positive, False_positive], [False_negative, true_negative]] ],
    'accuracy': 0.98,
    'attrVs': ['Male', 'Female']  # sensitive value
}
1. visualize the color map bar (If have)
2. visualize the two confusion matrices
3. visualze the accuracy number
4. vis Accuracy change
*/
function visOutputPanel(divSelector, data, colorMapDiv='', CFScale='', opacityScale='', accChange='', malePredChange='', femalePredChange=''){
    let CFData = data['data'];
    let accuracy = data['accuracy'];
    const previlageCF = divSelector.select('.previlageCF');
    const unprevilageCF = divSelector.select('.unprevilageCF');

    // get the color scale
    let maxValue = d3.max(CFData.flat(3));
    maxValue = (parseInt(maxValue/10)+1)*10;
    if(!CFScale){
        CFScale = d3.scaleLinear().domain([0, maxValue])
            .range(['rgba(91, 155, 213, 0.2)', 'rgba(91, 155, 213, 1)']);
        opacityScale = d3.scaleLinear().domain([0, maxValue])
            .range([0.2, 1]);
    }
    // visualize the colormap div
    if(colorMapDiv){
        colorMapDiv.selectAll('*').remove();
        addColorLegend(colorMapDiv, 'OutputPanel', CFScale);
    }
    // visualize the 2 confusion matrices 
    visConfusionMatrixPanel(previlageCF, CFData[0], 0, false, opacityScale, '', malePredChange);
    visConfusionMatrixPanel(unprevilageCF, CFData[1], 1, false, opacityScale, '', femalePredChange);

    // visualize the accuracy
    const f = d3.format(",.1%");
    divSelector.select('.accNum').text(f(accuracy));
    if(accChange!=0){
        console.log('enter the accchange', accChange);
        let symbol = accChange<0? '\u2193':'\u2191';
        let symbolColor = accChange<0? '#E06666':'#4384F4';
        divSelector.select('.accChange').text(symbol+`${f(Math.abs(accChange))}`)
            .style('color', symbolColor);
    }


}

/* visualize the color legend for the confunsion matrix 
 * @param {*} id: the id of gradient
 * horizontal: the direction of the color map
 * CFScale: color scale for the confusion matrix
*/
function addColorLegend(colorMapDiv, gradId, CFScale, horizontal=true){
    // creat a same svg with the colorMapDiv
    let width = parseFloat(colorMapDiv.style('width'));
    let height = parseFloat(colorMapDiv.style('height'));
    let svgSelector = colorMapDiv.append('svg')
        .style('width', '100%')
        .style('height', '100%')
        .style('viewBox', `0 0 ${width} ${height}`);
    let legendG = svgSelector.append('g');
    let [min, max] = CFScale.domain();
    let [minColor, maxColor] = CFScale.range();
    
    // if it is horizontal
    if(horizontal){
        let marginV = height/3;  // top and bottom margin
        let marginH = width/10; // left and right margin
        let dim = {
            wid: width-marginH*2,
            hei: height-marginV*2,
        };
        // gradient generator
        let graGenerator = svgSelector.append('linearGradient').attr('id', gradId)
            .attr('x1', '0').attr('x2', '1').attr('y1', '0').attr('y2', '0');
        graGenerator.append('stop').attr('offset', '0').attr('stop-color', minColor);
        graGenerator.append('stop').attr('offset', '1').attr('stop-color', maxColor);
        // rect
        legendG.append('rect').attr('x', marginH).attr('y', marginV).attr('width', dim.wid).attr('height', dim.hei).attr('fill', `url(#${gradId})`);
        // dismiss ticks, use the start and the end number instead
        legendG.append('text')
            .attr('x', marginH).attr('y', height/2).attr('dy', '0.5em').attr('dx', '-0.2em')
            .attr('text-anchor', 'end')
            .attr('font-size', `${marginV}px`)
            .text(min);
        legendG.append('text')
            .attr('x', marginH+dim.wid).attr('y', height/2).attr('dy', '0.5em').attr('dx', '0.2em')
            .attr('text-anchor', 'begin')
            .attr('font-size', `${marginV}px`)
            .text(max);
    }
    else{
        let marginV = height/6;  // top and bottom margin
        let marginH = width/2.5; // left and right margin
        let dim = {
            wid: width-marginH*2,
            hei: height-marginV*2,
        };
        // gradient generator
        let graGenerator = svgSelector.append('linearGradient').attr('id', gradId)
            .attr('x1', '0').attr('x2', '0').attr('y1', '1').attr('y2', '0');
        graGenerator.append('stop').attr('offset', '0').attr('stop-color', minColor);
        graGenerator.append('stop').attr('offset', '1').attr('stop-color', maxColor);
        // rect
        legendG.append('rect').attr('x', marginH).attr('y', marginV).attr('width', dim.wid).attr('height', dim.hei).attr('fill', `url(#${gradId})`);
        // only add the minimum number and the maximum number
        legendG.append('text')
            .attr('x', marginH+dim.wid/2).attr('y', marginV+dim.hei).attr('dy', '1em')
            .attr('text-anchor', 'middle')
            .attr('font-size', `${marginV/3}px`)
            .text(min);
        legendG.append('text')
            .attr('x', marginH+dim.wid/2).attr('y', marginV).attr('dy', '-0.2em')
            .attr('text-anchor', 'middle')
            .attr('font-size', `${marginV/3}px`)
            .text(max);
    }
    
}  

// let outputLabel = ['p ', 'n', 'p\'', 'n\''];
// let attrVs = ['Male', 'Female'];

/**
 * visualize the confusion matrix inside the divSelector
 * @param {*} divSelector 
 * @param {*} idx visualize which confusion matrix we should use  either 1 or 0
 * opacityScale: color scale for the confusion matrix data
 */
 function visConfusionMatrixPanel(divSelector, CFData, idx, interactive = false, opacityScale='', FairMetricsPanelObj, predChange=''){
    // clear the existing elements
    divSelector.selectAll('*').remove();

    // divSelector.classed('CF', true);

    // confusionMatrix data
    CFData = {'TP': CFData[0][0], 'FN': CFData[0][1], 'FP': CFData[1][0], 'TN': CFData[1][1]}

    let divWidth = parseInt(divSelector.style("width"));
    let divHeight = parseInt(divSelector.style("height"));
    // dimension of the confusion matrix div
    CMDim ={
        margin: {'L': divWidth*0.02, 'T': divWidth*0.02, 'R': divWidth*0.02, 'B': divWidth*0.03},
        title1: divWidth*0.06,   // 'Male' 'Female'
        title2: divWidth*0.05,   // 'Predicted', 'Actual'
        title3: divWidth*0.04,   // 'deny', 'Approve'
        gap1: divWidth*0.01,    // gap between title 3 and rect
        gap2: divWidth*0.01,    // gap between title 3 and title 2
        numSize: divWidth*0.055,
    }
    let dim = CMDim;
    dim.marginL = dim.margin.L+dim.title2+dim.title3+dim.gap1+dim.gap2;
    dim.marginT = dim.margin.T+dim.title2+dim.title3+dim.gap1+dim.gap2;
    dim.rectWid = (divWidth-dim.marginL-dim.margin.R)/2;
    dim.rectHei = (divHeight-dim.marginT-dim.margin.B-dim.title1)/2;

    // init svg
    let divSvg = divSelector.append('svg').attr('width', divWidth).attr('height', divHeight);

    // visualize the four rects
    let visRect = (GSelector, x, y, className)=>{
        GSelector.append('rect')
            .attr('x', x).attr('y', y)
            .attr('width', dim.rectWid).attr('height', dim.rectHei)
            .classed(className, true)
            .attr('fill', '#5B9BD5')
            .style('opacity', opacityScale(CFData[className]))
            .attr('stroke', 'white')
            .attr('stroke-width', '2.6px');
        // append the number text if not interactive
        if(interactive){return;}
        GSelector.append('text')
            .classed('CMNumFont', true)
            .attr('x', x+dim.rectWid/2)
            .attr('y', y+dim.rectHei/2)
            .style('font-size', `${CMDim.numSize}px`)
            .attr('text-anchor', 'middle')
            .attr('dy', '0.5em')
            .text(CFData[className])
            .attr('cursor', 'default');
    }
    let rectGroups = divSvg.append('g').classed('rects', true)
        .style('transform', `translate(${dim.marginL}px, ${dim.marginT}px)`);
    visRect(rectGroups, 0, 0, 'TP');
    visRect(rectGroups, dim.rectWid, 0, 'FN');
    visRect(rectGroups, 0, dim.rectHei, 'FP');
    visRect(rectGroups, dim.rectWid, dim.rectHei, 'TN');
    
    // CFGroup.style('transform', `translate(${text_width + margin/2}px, ${text_width + margin/2}px)`);

    // if interactive, append <input> for each number in confusion matrix
    if(interactive){
        function numChange(){
            // when a number change, then send the new confusion matrix to the fairness object
            let tpV = divSelector.select('.TPval').node().value;
            let fnV = divSelector.select('.FNval').node().value;
            let fpV = divSelector.select('.FPval').node().value;
            let tnV = divSelector.select('.TNval').node().value;
            if(isNaN(tpV)||isNaN(fnV)||isNaN(fpV)||isNaN(tnV)){
                return;
            }
            if(parseInt(tpV)+parseInt(fpV)==0){return;}
            let newCM = [[parseInt(tpV), parseInt(fnV)],[parseInt(fpV), parseInt(tnV)]];
            FairMetricsPanelObj.update(newCM, idx);
            // rerender the color of confusion matrix
            let className = d3.select(this).attr('class').substring(0, 2);
            let newVal = d3.select(this).node().value;
            divSelector.select('.'+className).style('opacity', opacityScale(newVal));
        }
        // IOS not support the such input https://stackoverflow.com/questions/62300321/mobile-ios-input-type-date-min-and-max-not-working-on-chrome-and-safari
        let addInputs = (x, y, className, value)=>{
            // let offset = text_width + margin/2;
            divSelector.append('input')   
                .classed(className, true)
                .attr("value", value)
                .attr("inputMode", 'numeric')
                .on('change', numChange)
                .style('left', function(){return `${dim.marginL+x+dim.rectWid/2-parseFloat(d3.select(this).style('width'))/2}px`})
                .style('top', function(){return `${dim.marginT+y+dim.rectHei/2-parseFloat(d3.select(this).style('height'))/2}px`});
        }
        addInputs(0, 0, 'TPval', CFData['TP']);
        addInputs(dim.rectWid, 0, 'FNval', CFData['FN']);
        addInputs(0, dim.rectHei, 'FPval', CFData['FP']);
        addInputs(dim.rectWid, dim.rectHei, 'TNval', CFData['TN']);
    }

    // visualize the two axises Approve / Deny
    let outputLabel = ['Approve', 'Deny', 'Approve', 'Deny'];
    let textGroup = divSvg.append('g');
    let visText = (x, y, text, angle, pos, change='')=>{
        let textObj = textGroup.append('text').attr('x', 0).attr('y', 0).text(text)
            .classed('CMTitle2Font', true)
            .attr('text-anchor', pos)
            .attr('font-size', `${dim.title3}px`)
            .style('transform', `translate(${x}px, ${y}px) rotate(${angle}deg)`)
        if(change){
            let symbol = change<0? '\u2193':'\u2191';       
            let symbolColor = change<0? '#E06666':'#4384F4';
            textObj.append('tspan').style('fill', symbolColor).text(symbol+Math.abs(change));
        }
    }
    visText(dim.marginL+dim.rectWid/2, dim.marginT-dim.gap1, outputLabel[0], 0, 'middle', predChange[0]);
    visText(dim.marginL+3*dim.rectWid/2, dim.marginT-dim.gap1, outputLabel[1], 0, 'middle', predChange[1]);
    visText(dim.marginL-dim.gap1, dim.marginT+dim.rectHei/2, outputLabel[2], -90, 'middle');
    visText(dim.marginL-dim.gap1, dim.marginT+3*dim.rectHei/2, outputLabel[3], -90, 'middle');

    // visualize the title: Actual / Predicted
    let title2Group = divSvg.append('g');
    let visBigText = (x, y, text, angle)=>{
        return title2Group.append('text').attr('x', 0).attr('y', 0).text(text).attr('text-anchor', 'middle')
            .classed('CMTitle1Font', true)
            .attr('font-size', `${dim.title2}px`)
            .style('transform', `translate(${x}px, ${y}px) rotate(${angle}deg)`);
    }
    visBigText(dim.marginL+dim.rectWid, dim.margin.T+dim.title2, 'Predicted', 0);
    visBigText(dim.margin.L+dim.title2, dim.marginT+dim.rectHei, 'Actual', -90);

    // visualize the title of the group
    let title = groupsText[idx];
    divSvg.append('g').append('text')
        .attr('x', `${dim.marginL+dim.rectWid}px`)
        .attr('y', `${dim.marginL+dim.rectHei*2+dim.title1}px`)
        .text(title).attr('text-anchor', 'middle')
        .attr('font-size', `${dim.title1}px`)
        .classed('CMTitleFont', true);
    return divSelector;
}


/**
 * visualize different kinds of fairness metrics 
 * @param {*} divSelector the fairness metric div
 * @param {*} metricName 
 * @param {*} metricData [{'original': 0.1}, {'mitigate': 0.2}...]
 */
 function visFairMetricPanel(divSelector, metricName, metricData){
    let divWid = parseFloat(divSelector.style('width'));
    let globalRatio = divWid/310;
    // the dimension for the fairness metric panel
    let fairMetricDim = {
        margin: {left: 70*globalRatio, right: 30*globalRatio, top: 80*globalRatio, bottom: 30*globalRatio},
        wid: 310*globalRatio,
        itemHei: 35*globalRatio,    // the height of each fairness metric item
    }
    // reset the margin when has a long title

    if(metricData.length==2){
        let focus_key = Object.keys(metricData[1])[0];
        if(focus_key=='OptimPreproc' || focus_key=='PrejudiceRmv'){
            fairMetricDim.margin.left = 85*globalRatio;
            fairMetricDim.margin.right = 15*globalRatio;
        }
        else if(focus_key=='Reweighing' || focus_key=='Adversarial'){
            fairMetricDim.margin.left = 75*globalRatio;
            fairMetricDim.margin.right = 25*globalRatio;
        }
    }
    fairMetricDim.innerWid = fairMetricDim.wid - fairMetricDim.margin.left - fairMetricDim.margin.right;

    // set the class
    divSelector.selectAll('*').remove();
    divSelector.style('height', null);
    divSelector.classed('fairMetricDiv', true);    // reset the name here
    // reset the height
    let barLen = 50*globalRatio;
    let heightTemp = globalRatio*230;
    divSelector.style('height', `${metricData.length==1? heightTemp-barLen:heightTemp}px`);

    divSelector.property('name', metricName);   // the name of this div selector

    // basic info
    let fairValue = fairMetricInfo[metricName].fair;
    let range = fairMetricInfo[metricName].range;
    let fontColor = '#213547';
    let gap = 10*globalRatio;       // the gap between two elements
    let baisAreaColor = '#EDEDED';          // '#FCF0F0'


    // init the div and the svg 
    // let margin_x = parseInt(divSelector.style("margin-left"));
    let margin_y = 10*globalRatio;
    let svg_width = parseInt(divSelector.style("width"));
    let svg_height = parseInt(divSelector.style("height"));
    let innerWid = svg_width - fairMetricDim.margin.left - fairMetricDim.margin.right;
    let itemHei = (svg_height - fairMetricDim.margin.top - fairMetricDim.margin.bottom)/metricData.length;
    // let barLen = itemHei;

    let divSvg = divSelector.append('svg')
        .attr('width', svg_width)
        .attr('height', svg_height);
    
    // visualization part
    let XScale = d3.scaleLinear()       // the scale for the metric value 
        .domain(fairMetricInfo[metricName].range)
        .range([fairMetricDim.margin.left, fairMetricDim.margin.left+innerWid]);

    // visualize the title
    divSvg.append('text').attr('x', svg_width/2).attr('y', 25*globalRatio)
        .attr('font-size', 15*Math.pow(globalRatio, 1/1.2))
        .attr('font-weight', 500)
        .attr('fill', fontColor)
        .attr('text-anchor', 'middle')
        .classed('metricTitle', true)
        .text(fairMetricInfo[metricName].fullName);
    
    // visualize the bais part
    divSvg.append('rect')
        .attr('x', XScale(range[0])).attr('y', fairMetricDim.margin.top)
        .attr('width', XScale(fairValue)-XScale(range[0])).attr('height', metricData.length*barLen)
        .attr('fill', baisAreaColor)
        .attr('fill-opacity', '0.5');

    // viusualize the axis
    let tickSize = 5*globalRatio;
    let xAxis = d3.axisBottom(XScale).ticks(5).tickSize(tickSize);
    let axisG = divSvg.append('g')
        .attr('transform', `translate(0, ${fairMetricDim.margin.top})`)
        .call(xAxis);
    axisG.selectAll('g').style('font-size', `${10*globalRatio}px`)  // change the size of text
    axisG.selectAll('line').attr('y2', -tickSize);      // reverse the ticks
    axisG.selectAll('text').attr('y', -15*globalRatio);         // change the y text
    axisG.select('path').remove();      // remove the previous one
    axisG.selectAll('line').attr('stroke', fontColor);
    axisG.selectAll('text').attr('fill', fontColor);
    axisG.append('line')
        .attr('x1', fairMetricDim.margin.left).attr('y1', 0)
        .attr('x2', fairMetricDim.margin.left+innerWid).attr('y2', 0)
        .attr('stroke', fontColor);

    // visualize the fair text & Line
    divSvg.append('text').attr('x', fairMetricDim.margin.left+innerWid/2).attr('y', 50*globalRatio)
        .attr('font-size', 12*globalRatio)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ED7D32')
        .attr('font-weight', 500)
        .text('Fair');
    divSvg.append('line')
        .attr('x1', XScale(fairValue)).attr('y1', (50+5)*globalRatio)
        .attr('x2', XScale(fairValue)).attr('y2', svg_height-fairMetricDim.margin.bottom)
        .attr('stroke-width', 2*globalRatio)
        .attr('stroke-dasharray', `${3*globalRatio} ${3*globalRatio}`) 
        .attr('stroke', '#ED7D32');

    // visualize each part
    divSvg.selectAll('metric').data(metricData).enter().append('g')
        .each(function(d, i){
            let yCenter = fairMetricDim.margin.top + barLen*i+barLen/2;
            let key = Object.keys(d)[0]

            let curColor = fontColor;
            if(i == metricData.length -1){
                curColor = '#5B9BD5';
            }

            // visualize the text
            d3.select(this).append('text')
                .attr('x', fairMetricDim.margin.left-gap/2).attr('y', yCenter)
                .attr('dy', '0.5em')
                .attr('text-anchor', 'end')
                .text(key)
                .attr('font-size', 12*globalRatio)
                .attr('font-weight', ()=>i == metricData.length-1 ? 600 : 'none')
                .attr('fill', curColor)
                .attr('stroke-width', 0)
                .classed('lastMetric',  i == metricData.length -1? true:false);

            // visualize separate line
            d3.select(this).append('line')
                .attr('x1', XScale(range[0])).attr('y1', yCenter+barLen/2)
                .attr('x2', XScale(range[1])).attr('y2', yCenter+barLen/2)
                .attr('stroke', 'grey')
                .attr('stroke-width', 0.2);
                
            // visualize the bars
            d3.select(this).append('line')
                .attr('x1', XScale(d[key])).attr('y1', yCenter-barLen/2+5*globalRatio)
                .attr('x2', XScale(d[key])).attr('y2', yCenter+barLen/2-5*globalRatio)
                .attr('stroke', curColor)
                .attr('stroke-width', `${3*globalRatio}px`)
                .classed('lastMetric',  i == metricData.length -1? true:false);

            // visualize the value
            d3.select(this).append('text')
                .attr('x', ()=>{
                    if(d[key]<fairValue && XScale(d[key])-XScale(fairValue)<30){
                        return  XScale(d[key])-5;
                    }
                    else{
                        return  XScale(d[key])+5;
                    }
                })
                .attr('y', yCenter)
                .attr('dy', '0.5em')
                .attr('text-anchor', ()=>{
                    if(d[key]<fairValue && XScale(d[key])-XScale(fairValue)<30){
                        return 'end';
                    }
                    else{
                        return  'start';
                    }
                })
                .text(d[key])
                .attr('fill', curColor)
                .attr('fill-opacity', 0.6)
                .attr('font-size', 10*Math.sqrt(globalRatio))
                .attr('stroke-width', 0)
                .classed('lastMetric',  i == metricData.length -1? true:false);

        });
    
    // visualize the bias square
    divSvg.append('rect')
        .attr('x', XScale(range[0])).attr('y', svg_height-2*margin_y-fairMetricDim.margin.bottom + 23*globalRatio)
        .attr('width', 15*globalRatio).attr('height', 15*globalRatio)
        .attr('fill', baisAreaColor);
    
    // text
    divSvg.append('text').attr('x', XScale(range[0])+20*globalRatio)
        .attr('y', svg_height-2*margin_y-fairMetricDim.margin.bottom + 23*globalRatio)
        .attr('font-size', 10*globalRatio)
        .attr('dy', '1em')
        .attr('text-anchor', 'start')
        .text('Bias against female')
        .attr('fill', fontColor);
}















/*[ [[true_positive, False_positive], [False_negative, true_negative]],
        [[true_positive, False_positive], [False_negative, true_negative]] ], */
// [[[1, 10], [1, 12]], [[1, 20], [10, 15]]]
// let confusionMatrixData = '';
let CFScale = '';   // the scale of confusion matrix (number->color)
let opacityScale = '';  // the scale of opacity and the color
let trainData = '';     // [[male_positive, male_negative], [female_positive, female_negative]]
let testData = '';
let weights = '';   // the weights of after reweighing
let LRFTrainData = '';      // the train data after the LRF
let OptimPreprocTrainData = ''  // the train data after the OptimPreproc

let outputDict = {'German': ['Approve', 'Deny'], 'Bank': ['Yes', 'No']};
let outputLabel = outputDict['German'];
let attrValueDict = {'German': ['Male', 'Female'], 'Bank': ['Married', 'Unmarried']};
let attrVs = attrValueDict['German'];

// the dimension of the confusion matrix div
// let CMDim = {       // dimension for the confusion matrix div
//     margin: {left: 30, right: 10, top: 35, bottom: 10},
//     width: 180,
//     height: 140
// }
// CMDim.wrapperWid = CMDim.width + CMDim.margin.left + CMDim.margin.right;
// CMDim.wrapperHei = CMDim.height + CMDim.margin.top + CMDim.margin.bottom;

// the dimesion for the output div
let outputDivDim = {
    divMargin: {       // the margin of the the div containing the confusion matrix div
        top: 10,    // 30
        bottom: 15, // 30
        right: 10,      //15
        left: 10,       // 15
    },

    divGap: 10,       // the gap between the two divs

    accuracyHeight: 0,
}
outputDivDim.width = CMDim.wrapperWid + outputDivDim.divMargin.left + outputDivDim.divMargin.right;
outputDivDim.CMHeight = CMDim.wrapperHei + outputDivDim.divMargin.top + outputDivDim.divMargin.bottom;
outputDivDim.height = outputDivDim.CMHeight*2 + outputDivDim.accuracyHeight + outputDivDim.divGap*2;


// the dimension for the train/div panel
let ttDivDim = {
    barStyles: {        // the style of the bar chart
        barWidth: 25,
        innerPadding: 20, 
        outerPadding: 15
    },
    margin:{        // the margin for the svg
        top: 25,
        bottom: 25,
        right: 15,
        left: 15,
    }
}

ttDivDim.boundedWidth = ttDivDim.barStyles.outerPadding*2 + ttDivDim.barStyles.innerPadding + ttDivDim.barStyles.barWidth*4;
ttDivDim.wrapperWidth = ttDivDim.boundedWidth + ttDivDim.margin.left + ttDivDim.margin.right;
// the X & Y axis scale for the bar chars
let yScaleBarDict = {'German': d3.scaleLinear().domain([0, 400]).range([0, 600]), 'Bank': d3.scaleLinear().domain([0, 3000]).range([0, 500])};
let yScaleBar = yScaleBarDict['German'];   // have scalability issue
// let yScaleBar = d3.scaleLinear().domain([0, 3000]).range([0, 500]);   // have scalability issue
let xScaleBar = (i)=> ttDivDim.barStyles.outerPadding + ttDivDim.barStyles.barWidth * (2*i + 1) 
    + i * ttDivDim.barStyles.innerPadding;

// let attrVs = ['Male', 'Female'];
 
/**
 * create an accuracy panel
 * @param {*} divSelector  the accuracy div
 * @param {*} accuracyData [{'original': 0.95}, {'mitigate': 0.2}...]
 */
function visAccuracyPanel(divSelector, accuracyData){
    // accuracyData = [{'baseline': 0.7}, {'mitigate': 0.8}];
    // accuracyData.push({'reweigh': 0.76})
    // accuracyData.push({'post': 0.68})

    // set the class
    divSelector.classed('accMetricDiv', true).classed('allCenter', true);

    // basic info
    let range = [0, 1];
    // let barLen = fairMetricDim.itemHei;
    let fontColor = '#213547';
    let gap = 10;       // the gap between two elements

    // init the div and the svg 
    let divWid = fairMetricDim.wid
    let divHei = fairMetricDim.margin.top + fairMetricDim.margin.bottom 
        + fairMetricDim.itemHei*accuracyData.length;
    divSelector
        .style('width', divWid+'px')
        .style('height', divHei+'px');
    let margin = 10;
    let svg_width = divWid - 2*margin;
    let svg_height = divHei - 2*margin
    let divSvg = divSelector.append('svg')
        .attr('width', svg_width)
        .attr('height', svg_height);

    let margin_bottom = margin;
    let innerWid = svg_width - fairMetricDim.margin.left - fairMetricDim.margin.right;
    let itemHei = (svg_height - fairMetricDim.margin.top - margin_bottom)/accuracyData.length;
    let barLen = itemHei;

    // visualization part
    let XScale = d3.scaleLinear()       // the scale for the metric value 
        .domain(range)
        .range([fairMetricDim.margin.left, fairMetricDim.margin.left+innerWid]);
    
     // viusualize the axis
     let tickSize = 5;
     let xAxis = d3.axisBottom(XScale).ticks(5).tickSize(tickSize);
     let axisG = divSvg.append('g')
         .attr('transform', `translate(0, ${fairMetricDim.margin.top})`)
         .call(xAxis);
     axisG.selectAll('line').attr('y2', -tickSize);      // reverse the ticks
     axisG.selectAll('text').attr('y', -15);         // change the y text
     axisG.select('path').remove();      // remove the previous one
     axisG.selectAll('line').attr('stroke', fontColor);
     axisG.selectAll('text').attr('fill', fontColor);
     axisG.append('line')
         .attr('x1', fairMetricDim.margin.left).attr('y1', 0)
         .attr('x2', fairMetricDim.margin.left+innerWid).attr('y2', 0)
         .attr('stroke', fontColor);
    
     // visualize the title
     divSvg.append('text').attr('x', svg_width/2+margin).attr('y', 25)
        .attr('font-size', 15)
        .attr('font-weight', 500)
        .attr('fill', fontColor)
        .attr('text-anchor', 'middle')
        .text('Accuracy');
    
    // visualize each part
    divSvg.selectAll('accuracy').data(accuracyData).enter().append('g')
        .each(function(d, i){
            let yCenter = fairMetricDim.margin.top + barLen*i+barLen/2;
            let key = Object.keys(d)[0]

            let curColor = fontColor;
            if(i == accuracyData.length -1){
                curColor = '#5B9BD5';
            }

            // visualize the text
            d3.select(this).append('text')
                .attr('x', fairMetricDim.margin.left-gap/2).attr('y', yCenter)
                .attr('dy', '0.5em')
                .attr('text-anchor', 'end')
                .text(key)
                .attr('font-size', 12)
                .attr('font-weight', ()=>i == accuracyData.length-1 ? 600 : 'none')
                .attr('fill', curColor);
            
            // visualize a bar
            d3.select(this).append('rect')
                .attr('x', XScale(range[0])).attr('y', yCenter-barLen/2+5)
                .attr('width', XScale(d[key])-XScale(range[0])).attr('height', barLen-10)
                .attr('fill', curColor)
                .attr('fill-opacity', 0.2);

            // visualize separate line
            d3.select(this).append('line')
                .attr('x1', XScale(range[0])).attr('y1', yCenter+barLen/2)
                .attr('x2', XScale(range[1])).attr('y2', yCenter+barLen/2)
                .attr('stroke', 'grey')
                .attr('stroke-width', 0.2);
                
            // visualize the bars
            d3.select(this).append('line')
                .attr('x1', XScale(d[key])).attr('y1', yCenter-barLen/2+5)
                .attr('x2', XScale(d[key])).attr('y2', yCenter+barLen/2-5)
                .attr('stroke', curColor)
                .attr('stroke-width', '3px');

            // visualize the value
            d3.select(this).append('text')
                .attr('x', XScale(d[key])+5).attr('y', yCenter)
                .attr('dy', '0.5em')
                .attr('text-anchor', 'begin')
                .text(d[key])
                .attr('fill', curColor)
                .attr('fill-opacity', 0.6)
                .attr('font-size', 10);

        });
    
    

}


/**
 * render a line on svg
 * @param {*} svg 
 * @param {*} startPoint [x, y]
 * @param {*} endPoint [x, y] markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
 */
function renderArrow(svg, startPoint, endPoint){
    // define the arrow
    if(svg.select('#arw').empty()){
        svg.append('defs').append('marker')
            .attr('id', 'arw')
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('refX', 6)
            .attr('refY', 3)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M 0 0 L 6 3 L 0 6')
            .attr('stroke', 'none')
            .attr('fill', '#8497B0');
    }
    
    let pointLst = [startPoint, endPoint];
    if(startPoint[1]!=endPoint[1]){
        let middlePoint = [endPoint[0], startPoint[1]];
        pointLst = [startPoint, middlePoint, endPoint];
    }

    // add the row
    let arrowSelector = svg.append('path')
        .attr('d', d3.line()(pointLst))
        .attr('stroke', '#8497B0')
        .attr('marker-end', 'url(#arw)')
        .attr('fill', 'none');

    return arrowSelector;
}