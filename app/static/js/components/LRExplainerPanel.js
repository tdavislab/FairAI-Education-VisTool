/*visualize the test part*/

class LRExplainerPanel{
    constructor(templateId, setPosition = -1){
        this.name = 'LRExplainer';
        this.setPosition = setPosition;     // the location of this object in the set; if < 0, means not in a set
        // clone 
        const visualComponentNode = document.getElementById(templateId);
        const cloneNode = visualComponentNode.content.cloneNode(true).querySelector('.visualComponentContainer');
        document.getElementById('contentDiv').appendChild(cloneNode);
        d3.select(cloneNode).classed('newVisualComponent', true); // 'newVisualComponent' as a label for future removal

        // collection of selectors
        /*1. Div*/
        this.containerDiv = d3.select(cloneNode);
        this.trainDiv = this.containerDiv.select('.train');
        this.testDiv = this.containerDiv.select('.test');
        this.modelCTNDiv = this.containerDiv.select('.modelContainer'); // model container
        this.modelDiv = this.modelCTNDiv.select('.model');
        this.resultDiv = this.containerDiv.select('.result');
        /*2. Button*/
        this.trainButton = this.modelCTNDiv.select('.trainBtn');
        this.testButton = this.modelCTNDiv.select('.testBtn');
        /*3. svg*/
        this.modelCTNSvg = '';
        this.trainSvg = '';
        this.testSvg = '';
        this.resultSvg = '';
        this.modelSvg = '';
        
        // settings for charts
        this.dataChartSetup = {
            top: 0.32,   // padding top
            left: 0.12, // padding left
            contentWid: 0.8,    // width of content of the main part
            contentHei: 0.4,     // height of content of the main part
            barHei: 0.12,   // height of each bar
            fontSize: 0.08,
            // barGap: 0.1, // gap between bars 
            xScale: '',
            yScale: '',
            nodeR: ''   // the radius of node: barhei/2
        }
        this.modelChartSetup = {    // model div
            top: 0.15,   // padding top
            left: 0.1, // padding left
            contentWid: 0.8,    // width of content of the main part
            contentHei: 0.7,     // height of content of the main part
            fontSize: 0.055,
            xScale: '',
            yScale: ''
        }

        // data set
        this.data = {
            trainD: '',
            testD: '',
            predD: ''
        }

        // change the state of this model
        this.firstModifyTrain = true;    // this is the first time of modifying the train node
        this.firstModifyTest = true;    // this is the first time of modifying the test node

        // model state
        this.modelState = {
            a: '',  // coes for LR model
            b: '',
            curLRLine: '',    // the current LR line
            lastLRLine: '',   // the LR line of last time
            modelReady: false
        }

        // color map
        this.colorMap = {
            lightgrey: '#C9C9C9',
            grey: '#A5A5A5',
            blackblue: '#525252',
            lightblackblue: '#8497B0',
            llightblackblue: '#ADB9CA',
            lightblue: '#8497B0',
            blue: '#4472C4',
            orange: '#ED7D31',
            darkblue: '#44546A',
            red: '#C00000',
            curve: '#202124',
            arrow: '#777777'
        };
        
        // highlight divs
        this.highlightColor = '#4384F4';

        this.init();
    }

    /**
     *  process everything
     */
    async init(){
        // 1. Init layout 
        this.initLayout();
        // 2. visualize the background for the test/train/output/model panel
        this.visDataChartBg();
        // 3. visualize the background for the model panel
        this.visModelChartBg();
        // 4. get the train and test data
        await axios.post('/getLREData')
            .then((response)=>{
                let data = response.data;
                this.data.trainD = data['train'];
                this.data.testD = data['test'];
            })
            .catch((error)=>{
                console.log(error);
            });
        // 5. visualize train and test data
        this.visualizeData(this.trainSvg, this.data.trainD, 'train');
        this.visualizeData(this.testSvg, this.data.testD, 'test');
        this.beforeTrainStyle();

        // 6. event listener on the train and test button
        this.trainButton.on('click', ()=>{
            this.trainModel();
        });
        this.testButton.on('click', ()=>{
            this.testModel();
        });
        
    }

    /**
     * 1. add and set the sizes of all svg
     * 2. draw arrows
     * 3. position buttons
     */
    initLayout(){
        // size of divs
        let modelCTNWid = parseFloat(this.modelCTNDiv.style('width'));
        let modelCTNHei = parseFloat(this.modelCTNDiv.style('height'));
        let trainHei = parseFloat(this.trainDiv.style('height'));
        let modelHei = parseFloat(this.modelDiv.style('height'));
        let modelWid = parseFloat(this.modelDiv.style('width'));
        let trainWid = parseFloat(this.resultDiv.style('width'));
        let arrow_height = 7.5;

        // set size of svg
        this.modelCTNSvg = this.modelCTNDiv.append('svg').style('width', `${modelCTNWid}px`).style('height', `${modelCTNHei}px`);
        this.trainSvg = this.trainDiv.append('svg').style('width', `${trainWid}px`).style('height', `${trainHei}px`);
        this.testSvg = this.testDiv.append('svg').style('width', `${trainWid}px`).style('height', `${trainHei}px`);
        this.resultSvg = this.resultDiv.append('svg').style('width', `${trainWid}px`).style('height', `${trainHei}px`);
        this.modelSvg = this.modelDiv.append('svg').style('width', `${modelWid}px`).style('height', `${modelHei}px`);

        // arrows
        let arrowG = this.modelCTNSvg.append("g");
        arrowG.append("defs")       // create an arrow marker for train and test, respectivly
            .append("marker")
            .attr("id", "trainArrowhead")
            .attr("markerWidth", 13)
            .attr("markerHeight", 13)
            .attr("refX", "0")
            .attr("refY", 3)
            .attr("orient", "auto")
            .attr("markerUnits","strokeWidth")
            .attr("stroke-width","13")
            .append("path").attr("d", "M0,0 L0,6 L9,3 z").attr("fill", this.colorMap.arrow);
        arrowG.append("defs")       // create an arrow marker for train and test, respectivly
            .append("marker")
            .attr("id", "testArrowhead")
            .attr("markerWidth", 13)
            .attr("markerHeight", 13)
            .attr("refX", "0")
            .attr("refY", 3)
            .attr("orient", "auto")
            .attr("markerUnits","strokeWidth")
            .attr("stroke-width","13")
            .append("path").attr("d", "M0,0 L0,6 L9,3 z").attr("fill",this.colorMap.arrow);
        this.trainModelLine = arrowG.append("g");
        this.trainModelLine.append("line")
            .attr("x1", 0)
            .attr("y1", trainHei/2)
            .attr("x2", modelCTNWid/2)
            .attr("y2", trainHei/2)
            .classed('arrowLine', true);
        this.trainModelLine.append("line")
            .attr("marker-end", "url(#trainArrowhead)")
            .attr("x1", modelCTNWid/2)
            .attr("y1", trainHei/2)
            .attr("x2", modelCTNWid/2)
            .attr("y2", modelCTNHei-modelHei-(modelCTNHei/2-trainHei)-arrow_height)
            .classed('arrowLine', true); 
        this.evalModelLine = arrowG.append("line")
            .attr("marker-end", "url(#testArrowhead)")
            .attr("x1", 0)
            .attr("y1", modelCTNHei/2+trainHei/2)
            .attr("x2", (modelCTNWid-modelWid)/2-arrow_height-3)
            .attr("y2", modelCTNHei/2+trainHei/2)
            .classed('arrowLine', true);
        this.predictModelLine = arrowG.append("line")
            .attr("marker-end", "url(#testArrowhead)")
            .attr("x1", (modelCTNWid+modelWid)/2)
            .attr("y1", modelCTNHei/2+trainHei/2)
            .attr("x2", modelCTNWid-arrow_height-3)
            .attr("y2", modelCTNHei/2+trainHei/2)
            .classed('arrowLine', true);
        // text reminder for the successfully train and ask to train
        this.sucReminder = this.modelCTNSvg.append('text').classed('reminder', true).attr('dy', '1em');
        this.trnReminder = this.modelCTNSvg.append('text').classed('reminder', true).attr('dy', '1em');

        // position buttons and text
        let trainBtnWid = parseFloat(this.trainButton.style('width'));
        let testBtnWid = parseFloat(this.testButton.style('width'));
        let btnHei = parseFloat(this.testButton.style('height')); 
        this.trainButton.style('left', `${modelCTNWid/4-trainBtnWid/2}px`).style('top', `${trainHei/2-btnHei-3}px`);
        this.testButton.style('left', `${(modelCTNWid-modelWid)/4-testBtnWid/2}px`).style('top', `${modelCTNHei/2+trainHei/2-btnHei-3}px`);
        this.sucReminder.attr('x', modelCTNWid/4).attr('y', trainHei/2)
            .style('fill', this.highlightColor);
        this.trnReminder.attr('x', (modelCTNWid-modelWid)/4).attr('y', modelCTNHei/2+trainHei/2)
            .style('fill', '#E06666');
    }

    /**
     * visualize the background for the train/test/result chart
     */
    visDataChartBg(){
        // calculate dimensions
        let width = parseFloat(this.trainDiv.style('width'));   // the size of the entire div 
        let height = parseFloat(this.trainDiv.style('height'));
        let top = height*this.dataChartSetup.top;
        let left = width*this.dataChartSetup.left;
        let barHei = height*this.dataChartSetup.barHei;
        let contentWid = width*this.dataChartSetup.contentWid;
        let contentHei = height*this.dataChartSetup.contentHei;
        let fontSize = height*this.dataChartSetup.fontSize;
        this.dataChartSetup.nodeR = barHei/2-1;
        // calculate the x y scale
        let xDomain = [0, 100];
        let dataYDomain = [-0.7, 1];
        this.dataChartSetup.xScale = d3.scaleLinear()
            .domain(xDomain)
            .range([left, left+contentWid]); // rect width
        this.dataChartSetup.yScale = d3.scaleLinear()
            .domain(dataYDomain)
            .range([top+contentHei, top]);
        
        // render each chart of train/test/result
        const renderDataBg = (group, type='')=>{
            let xRange = this.dataChartSetup.xScale.range();
            let yRange = this.dataChartSetup.yScale.range();
            //1. add the xAxis
            this.renderAxis(group, [xRange[0], yRange[0]], [xRange[1], yRange[0]]);
            //2. add the text of the xAxis
            let addText = (x, y, anchor, color, dy, text, dx=0)=>{
                group.append('text')
                    .attr('x', x)
                    .attr('y', y)
                    .attr('font-size', fontSize)
                    .attr('text-anchor', anchor)
                    .style('fill', color)
                    .attr('dy', dy)
                    .attr('dx', dx)
                    .text(text);
            }
            addText(xRange[0], yRange[0], 'middle', this.colorMap.grey, '1em', '0');
            addText((xRange[0]+xRange[1])/2, yRange[0], 'middle', this.colorMap.blackblue, '1.5em', 'Credit score');
            addText(xRange[1], yRange[0], 'end', this.colorMap.grey, '1em', '100');
    
            //3. add the text of the yAxis
            addText(this.dataChartSetup.xScale(0), top-barHei/2, 'begain', this.colorMap.blackblue, '-1em', 'Grant loan?');
            addText(this.dataChartSetup.xScale(0), this.dataChartSetup.yScale(1), 'end', this.colorMap.orange, '0.5em', 'Yes', '-0.3em');
            addText(this.dataChartSetup.xScale(0), this.dataChartSetup.yScale(0), 'end', this.colorMap.blue, '0.5em', 'No', '-0.3em');
    
            //4. add the two bars
            let addBar = (y, label)=>{
                let bar = group.append('rect')
                    .attr('x', xRange[0])
                    .attr('y', y-barHei/2)
                    .attr('fill', this.colorMap.lightgrey)
                    .attr('width', contentWid)
                    .attr('height', barHei)
                    .attr('fill-opacity', 0.2);
    
                // if this is the trainDataPanel, then add the dblclick event
                if(type=='train'||type=='test'){
                    bar.on('dblclick', (event)=>{
                       this.rectDblClick(event, label, type); 
                    });
                }
            }
            addBar(this.dataChartSetup.yScale(1), 'yes');
            addBar(this.dataChartSetup.yScale(0), 'no');
        }
        // render backgroung for each div
        const trainG = this.trainSvg.append('g').classed('bg', true);
        renderDataBg(trainG, 'train');
        const testG = this.testSvg.append('g').classed('bg', true);
        renderDataBg(testG, 'test');
        const resultG = this.resultSvg.append('g').classed('bg', true);
        renderDataBg(resultG, 'result');
    }

    /**
     * render the model panel background
     */
    visModelChartBg(){
        // calculate dimensions
        let width = parseFloat(this.modelDiv.style('width'));   // the size of the entire div 
        let height = parseFloat(this.modelDiv.style('height'));
        let top = height*this.modelChartSetup.top;
        let left = width*this.modelChartSetup.left;
        let contentWid = width*this.modelChartSetup.contentWid;
        let contentHei = height*this.modelChartSetup.contentHei;
        let fontSize = height*this.modelChartSetup.fontSize;
        // calculate the x y scale
        let xDomain = [0, 100];
        let YDomain = [0, 1.02];
        let xRange = [left, left+contentWid];
        let yRange = [top+contentHei, top];
        this.modelChartSetup.xScale = d3.scaleLinear()
            .domain(xDomain)
            .range(xRange); 
        this.modelChartSetup.yScale = d3.scaleLinear()
            .domain(YDomain)
            .range(yRange);
        
        let group = this.modelSvg.append('g').classed('bg', true);

        //1. add the xAxis yAxis
        this.renderAxis(group, [xRange[0], yRange[0]],
            [xRange[1], yRange[0]]);
        this.renderAxis(group, [xRange[0], yRange[0]],
            [xRange[0], yRange[1]]);

        //2. add x axis text
        let addText = (x, y, anchor, color, dy, text, dx=0)=>{
            group.append('text')
                .attr('x', x)
                .attr('y', y)
                .attr('font-size', fontSize)
                .attr('text-anchor', anchor)
                .style('fill', color)
                .attr('dy', dy)
                .attr('dx', dx)
                .text(text);
        }
        addText((xRange[0]+xRange[1])/2, yRange[0], 'middle', this.colorMap.blackblue, '1.2em', 'Credit score');
        addText(xRange[0], yRange[0], 'middle', this.colorMap.grey, '1em', '0');
        addText(xRange[1], yRange[0], 'end', this.colorMap.grey, '1em', '100');

        //3. add y axis
        addText(xRange[0], yRange[1], 'middle', this.colorMap.blackblue, '-1.2em', 'y');
        addText(xRange[0], this.modelChartSetup.yScale(1), 'end', this.colorMap.grey, '0.5em', '1', '-0.3em');
        addText(xRange[0], this.modelChartSetup.yScale(0.5), 'end', this.colorMap.grey, '0.5em', '0.5', '-0.3em');

        //4. add two areas
        //4-1. add two gradients
        let addGradiens = (id, color, y1, y2)=>{
            let linearGradient = group.append('defs').append('linearGradient').attr('id', id)
                .attr('x1', "0%").attr('y1', y1).attr('x2', "0%").attr('y2', y2);
            linearGradient.append('stop').attr('offset', '0%').style('stop-color', color).style('stop-opacity', 0.3);
            linearGradient.append('stop').attr('offset', '100%').style('stop-color', color).style('stop-opacity', 0.05);
         }
        addGradiens('orangeGrad', '#ED7D31', '0%', '100%');
        addGradiens('blueGrad', '#4472C4', '100%', '0%');
    
        //4-2. add two rects
        let addRect = (id, y)=>{
            group.append('rect')
                .attr('x', xRange[0])
                .attr('y', y)
                .attr('width', contentWid)
                .attr('height', this.modelChartSetup.yScale(0.5)-this.modelChartSetup.yScale(1))
                .style('fill', `url(#${id})`);
        }
        addRect('orangeGrad', this.modelChartSetup.yScale(1));
        addRect('blueGrad', this.modelChartSetup.yScale(0.5));
    }

    /**
     * render axis according to the start and end point
     */
    renderAxis(svg, startPoint, endPoint){
        // define the arrow
        if(svg.select('#axisArw').empty()){
            svg.append('defs').append('marker')
                .attr('id', 'axisArw')
                .attr('markerWidth', 7)
                .attr('markerHeight', 6)
                .attr('refX', 0)
                .attr('refY', 3)
                .attr('orient', 'auto')
                .append('polygon')
                .attr('points', '0 0, 7 3, 0 6')
                .attr('fill', '#A5A5A5');
        }
        
        let pointLst = [startPoint, endPoint];
        if(startPoint[1]!=endPoint[1]){
            let middlePoint = [endPoint[0], startPoint[1]];
            pointLst = [startPoint, middlePoint, endPoint];
        }
        // add the row
        svg.append('path')
            .attr('d', d3.line()(pointLst))
            .attr('stroke', this.colorMap.grey)
            .attr('marker-end', 'url(#axisArw)')
            .attr('fill', 'none');
    }
    
    /**
     * add new node on bars in train/test div
     * @param {*} event 
     * @param {*} label yes/no
     * @param {*} type train/test
     */
    rectDblClick(event, label, type){
        // change the style
        if(type == 'train'&&this.firstModifyTrain){
            this.firstModifyTrain = false;
            this.beforeTrainStyle();
        }
        if(type == 'test'&&this.firstModifyTest){
            this.firstModifyTest = false;
            this.beforeTestStyle();
        }
    
        // 1. get the x,y position of node
        let x = event.layerX;
        if(navigator.userAgent.indexOf("Safari") != -1){
            if(navigator.userAgent.indexOf("Chrome") == -1){
                x = event.layerX;
            }
        }
        let y = label == 'yes'? 1:0;

        // 2. get the data of this node
        let datum = {'score': this.dataChartSetup.xScale.invert(x), 'y': y};
        
        // 3. identify the svg to be drawn according to the type of data
        let svg = type=='train'? this.trainSvg:this.testSvg;

        // 4. visualize the node
        svg.select('.nodes').append('circle').datum(datum)
            .attr('cy', d=>this.dataChartSetup.yScale(d.y))
            .attr('stroke', 'white')
            .attr('stroke-width', '0.5px')
            .attr('cx', d=>this.dataChartSetup.xScale(d.score))
            .attr('r', this.dataChartSetup.nodeR)
            .attr('fill', d=>parseInt(d.y)==1? this.colorMap.orange: this.colorMap.blue)
            .on("mouseover", mouseon)
            .on("mouseout", mouseoff)
            .call(this.drag());

        // 5. mouse over
        let that = this;
        function mouseon(){
            d3.select(this)
                .attr("r", that.dataChartSetup.nodeR*1.2)
                .style("opacity", 0.5);
        }
        function mouseoff(){
            d3.select(this)
                .attr("r", that.dataChartSetup.nodeR)
                .style("opacity", 1);
        }
    }

    /**
     * visualize the train or test or prediction data
     * @param {*} svg 
     * @param {*} data [{score: , y: , (pred: )}, {}, ...]
     * @param {*} type test/train
     */
    visualizeData(svg, data, type=''){
        if(!svg.selectAll('.nodes').empty()){
            svg.selectAll('.nodes').remove();
        }
        let nodesG = svg.append('g').classed('nodes', true);
        let nodes = nodesG.selectAll('nodes')
            .data(data)
            .enter().append('circle')
            .attr('cy', d=>{
                return type=='train'||type=='test'? this.dataChartSetup.yScale(d.y):this.dataChartSetup.yScale(d.pred)
            })
            .attr('stroke', 'white')
            .attr('stroke-width', '0.5px')
            .attr('cx', d=>this.dataChartSetup.xScale(d.score))
            .attr('r', this.dataChartSetup.nodeR)
            .attr('fill', d=>parseInt(d.y)==1? this.colorMap.orange: this.colorMap.blue);

        // if this is the train or test data, then we can drag the node
        if(type=='train'||type=='test'){
            nodes.on("mouseover", mouseon)
                .on("mouseout", mouseoff)
                .call(this.drag(type));
        }
        let that = this;
        function mouseon(){
            d3.select(this)
                .attr("r", that.dataChartSetup.nodeR*1.2)
                .style("opacity", 0.5);
        }
        function mouseoff(){
            d3.select(this)
                .attr("r", that.dataChartSetup.nodeR)
                .style("opacity", 1);
        }
    }

    // drag the train or test data node
    // type: train / test
    drag(type){
        let that = this;
        let r = that.dataChartSetup.nodeR;
        let accDy = 0;  // accumulated D
        let accDx = 0;

        function dragstarted() {
            accDy = 0; 
            accDx = 0;
            d3.select(this).attr("stroke", "black");
        }
        function dragged(event) {
            d3.select(this)
                .attr("cx", parseInt(d3.select(this).attr("cx"))+event.dx)
                .attr("cy", parseInt(d3.select(this).attr("cy"))+event.dy);
            accDy += event.dy;
            accDx += event.dx;
        }
        
        function dragended() {
            // if this is the first node to be modified
            if(type == 'train'&&that.firstModifyTrain){
                that.firstModifyTrain = false;
                that.beforeTrainStyle();
            }
            if(type == 'test'&&that.firstModifyTest){
                that.firstModifyTest = false;
                that.beforeTestStyle();
            }
          
            // restore the node
            d3.select(this).attr("stroke", "white");
            let xValue = parseInt(d3.select(this).attr("cx"));
            let creditScore = that.dataChartSetup.xScale.invert(xValue);
            
            // check if the node has been outside of the valid area
            if(Math.abs(accDy)>r || creditScore>100 || creditScore<0){
                d3.select(this).attr('fill', 'none').remove();   // delete the node
            }
            else{
                d3.select(this).attr('cy', d=>that.dataChartSetup.yScale(d.y));   // modify the node
                d3.select(this).datum(d=> {  // modify the datum attached to this node
                    return {'score': creditScore, 'y':d.y}
                });
            }
        }

        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }

    /**
     * visualize the nodes inside the model
     * @param {*} svg 
     * @param {*} data 
     */
    visualizeModelData(data){
        if(!this.modelSvg.selectAll('.nodes').empty()){
            this.modelSvg.selectAll('.nodes').remove();
        }
        let a = this.modelState.a;
        let b = this.modelState.b;

        let nodesG = this.modelSvg.append('g').classed('nodes', true);
        nodesG.selectAll('nodes').data(data)
            .enter().append('circle')
            .classed('modelDivNode', true)
            .attr('cy', d=>this.modelChartSetup.yScale(1.0/(1+Math.pow(Math.E, -(a*d.score+b)))))
            .attr('cx', d=>this.modelChartSetup.xScale(d.score))
            .attr('r', this.dataChartSetup.nodeR)
            .attr('fill', d=>parseInt(d.y)==1? this.colorMap.orange: this.colorMap.blue);
    }

    /**
     * train the model
     */
    async trainModel(){
        // disable all btns on this page;
        disableChapterBtns();
        await axios.post('/trainLREData', {
            data: this.trainSvg.selectAll('.nodes').selectAll('circle').data()
        })
        .then((response)=>{
            //0. enable all btns on this page
            enableChapterBtns();
            this.successReminder();
            //1. change the style
             this.firstModifyTrain = true;
            //2. fill the data
            let data = response.data;
            this.modelState.a = data['a'];
            this.modelState.b = data['b'];
            this.visualizeLRLine(data['a'], data['b']);
            //3. model ready
            this.modelState.modelReady = true;
            //4. enable the test process
            this.afterTrainStyle();
        })
        .catch((error)=>{
            console.log(error);
        });
    }

    /**
     * test the model
     */
    async testModel(){
        // disable all btns on this page;
        // disableChapterBtns();
        if(this.modelState.modelReady){
            await axios.post('/testLREData', {
                data: this.testSvg.selectAll('.nodes').selectAll('circle').data()
            })
                .then((response)=>{
                    // 0. enable all btns on this page
                    // enableChapterBtns();
                    this.firstModifyTest = true;
                    let data = response.data;
                    //1. visualize the model data
                    this.visualizeModelData(data);
                    //2. visualize the prediction data
                    this.visualizeData(this.resultSvg, data);
                })
                .catch((error)=>{
                    console.log(error);
                });
        }
        else{
            this.trainReminder();
            // enableChapterBtns();
        }
    }

    /**
     * visualize the LR model line
     * y = ax+b
     * the class is LRLine
     */
    visualizeLRLine(a, b){
        // first fade in the last current line
        if(this.modelState.curLRLine){
            this.modelState.curLRLine.style('stroke-opacity', 0.35);
            if(this.modelState.lastLRLine){
                this.modelState.lastLRLine.remove();
            }
            this.modelState.lastLRLine = this.modelState.curLRLine;
        }

        // 1. get the continous node
        let LRLineNodes = [];
        let sampleNum = 100;
        let xDomain = [0, 100]
        let sampleGap = (xDomain[1]-xDomain[0])/sampleNum;
        for(let i = 0; i < sampleNum; i++){
            let sampleX = xDomain[0]+sampleGap*i;
            let sampleY = 1.0/(1+Math.pow(Math.E, -(a*sampleX+b)));
            LRLineNodes.push({x: sampleX, y: sampleY});
        }

        // 2. function to visualize the line  
        let lineGenerator = d3.line()
            .x(d => this.modelChartSetup.xScale(d.x))
            .y(d => this.modelChartSetup.yScale(d.y));

        // 3. visualize the line
        this.modelState.curLRLine = this.modelSvg.append("path")
            .classed('LRLine', true)
            .attr('d', lineGenerator(LRLineNodes))
            .attr("fill", "none")
            .attr("stroke", this.colorMap.curve)
            .attr("stroke-width", 1)
            .attr("stroke-opacity", 0.8);
    }

    /**
     * before train, the border of train data, line and model are highlight color 
     */
     beforeTrainStyle(){
        // disable the model
        this.modelState.modelReady = false;

        // reset the test process        
        this.testDiv.classed('div-highlight', false);       
        this.modelDiv.classed('div-highlight', false);       
        this.modelDiv.select('.plotTitle').style('color', null);
        this.resultDiv.classed('div-highlight', false);       
        this.testDiv.select('.plotTitle').style('color', null);
        this.modelCTNSvg.select('#testArrowhead').select('path').style('fill', null);
        this.evalModelLine.classed('arrowLine-highlight', false);
        this.predictModelLine.classed('arrowLine-highlight', false);
        this.testButton.classed('LREButtonHighlight', false); 
        this.resultDiv.select('.plotTitle').style('color', null);


        // highlight train and model div and arrow lines and div title and button
        this.trainDiv.classed('div-highlight', true);       
        this.modelDiv.classed('div-highlight', true);       
        this.modelCTNSvg.select('#trainArrowhead').select('path').style('fill', this.highlightColor);
        this.trainModelLine.selectAll('line').style('stroke', this.highlightColor);
        this.trainDiv.select('.plotTitle').style('color', this.highlightColor);
        this.modelDiv.select('.plotTitle').style('color', this.highlightColor);
        this.trainButton.classed('LREButtonHighlight', true);

        // clear the nodes in prediction and model
        if(!this.modelSvg.selectAll('.nodes').empty()){
            this.modelSvg.selectAll('.nodes').remove();
        }
        if(!this.resultSvg.selectAll('.nodes').empty()){
            this.resultSvg.selectAll('.nodes').remove();
        }

        // remove the previous LRLine and then change the opacity of current line
        if(this.modelState.lastLRLine){
            this.modelState.lastLRLine.remove();
        }
        if(this.modelState.curLRLine){
            this.modelState.curLRLine.style('stroke-opacity', 0.35);
        }
    }

    /**
     * after train, the test and prediction data are hilightcolor, and the model become solid
     */
    afterTrainStyle(){
        // reset the style of train process 
        this.trainDiv.classed('div-highlight', false);        
        this.modelDiv.classed('div-highlight', false);    
        this.modelCTNSvg.select('#trainArrowhead').select('path').style('fill', null);
        this.trainModelLine.selectAll('line').style('stroke', null);
        this.trainDiv.select('.plotTitle').style('color', null);
        this.trainButton.classed('LREButtonHighlight', false);

        // set the style of test and prediction
        this.testDiv.classed('div-highlight', true);        
        this.modelDiv.classed('div-highlight', true);        
        this.modelDiv.select('.plotTitle').style('color', this.highlightColor);
        this.resultDiv.classed('div-highlight', true);        
        this.testDiv.select('.plotTitle').style('color', this.highlightColor);
        this.resultDiv.select('.plotTitle').style('color', this.highlightColor);
        this.modelCTNSvg.select('#testArrowhead').select('path').style('fill', this.highlightColor);
        this.evalModelLine.classed('arrowLine-highlight', true);
        this.predictModelLine.classed('arrowLine-highlight', true);
        this.testButton.classed('LREButtonHighlight', true);        
    }

    /**
     * when the test data changes, clear the nodes in the prediction and model
     */
    beforeTestStyle(){
        if(!this.modelSvg.selectAll('.nodes').empty()){
            this.modelSvg.selectAll('.nodes').remove();
        }
        if(!this.resultSvg.selectAll('.nodes').empty()){
            this.resultSvg.selectAll('.nodes').remove();
        }
    }

    /**
     * when the model is successfully trained
     */
     successReminder(){
        let that = this;
        this.sucReminder.text('Success! Now you can evaluate model');
        function clear(){
            that.sucReminder.html('');
            clearTimeout(that.successTimer);
        }
        this.successTimer = setTimeout(clear, 3000);
    }

    /**
     * when the model is not ready, biut request the test
     */
    trainReminder(){
        let that = this;
        this.trnReminder.text('Train model first!');
        function clear(){
            that.trnReminder.html('');
            clearTimeout(that.trainTimer);
        }
        this.trainTimer = setTimeout(clear, 3000);
    }

    /**enable all buttons on this page */
    enableBtns(){
        if(this.trainButton){
            this.trainButton.on('click', ()=>{
                this.trainModel();
            });
        }
        if(this.evalButton){
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