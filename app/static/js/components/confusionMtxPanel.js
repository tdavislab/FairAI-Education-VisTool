/**
 * Visulize the confusion matrix and the prediction
 */
class ConfusionMtxPanel{
    constructor(){
        d3.select('#confusionMtxPanelContainer').style('display', 'flex');

        // dimensions for the Prediction panel and confusion matrix panel
        this.margin = {        // margin for both panels including prediction and confusion matrix
            left: 50, 
            right: 50, 
            top: 20,
            bottom: 30
        }

        // selectors
        this.CFContainerSelector = d3.select('#CFContainer');
        this.PContainerSelector = d3.select('#PContainer');
        
        this.CFDivSelector = this.CFContainerSelector.select('.CF');
        visConfusionMatrixPanel(this.CFDivSelector, 0);

        // the size of the CFContainer and the 
        this.CFContainerSize = {width: parseInt(this.CFDivSelector.style('width')) + this.margin.left + this.margin.right,
            height: parseInt(this.CFDivSelector.style('height')) + this.margin.top + this.margin.bottom};
        this.PContainerSize = {width: 100, height: 0};
    
        // init the svg selector
        this.CFContainerSvg = '';
        this.PContainerSvg = '';

        // this.initGrid();    // init the grid style
        this.cloneDiv(0);   // clone prediction div and init the svg
        
        // add actions on the confusion matrix
        this.addActions();

        // add the change event on the select element (change group)
        this.selectChange();

    }

    initSvgSelector(){
        this.CFContainerSvg = this.CFContainerSelector.append('svg')
            .style('width', this.CFContainerSelector.style('width'))
            .style('height', this.CFContainerSelector.style('height'));
        this.PContainerSvg = this.PContainerSelector.append('svg')
            .style('width', this.PContainerSelector.style('width'))
            .style('height', this.PContainerSelector.style('height'));
    }

    /* 
    clone the div of the prediction result
    change the text (predicted)
    add legend
    update the size of the prediction div
    reset the grid style
    */
    cloneDiv(idx){
        // clear previous one
        this.PContainerSelector.selectAll('*').remove();

        // clone new one and add new visual components
        let clone = d3.select('#predictionPanel').selectAll('div').nodes()[idx].cloneNode(true);
        d3.select(clone).classed('prediction', true).style('top', 0);
        this.PContainerSelector.selectAll("div").remove();
        this.PContainerSelector.node().appendChild(clone);

        this.PContainerSize.width = this.margin.left+this.margin.right+parseInt(d3.select(clone).style('width'));
        this.PContainerSize.height = this.margin.top+this.margin.bottom+parseInt(d3.select(clone).style('height'));
        this.initGrid();
        // init the svg
        if(this.CFContainerSvg){
            this.CFContainerSvg.remove();
        }
        this.initSvgSelector();
        
        // add text and legend
        d3.select(clone).select('p').text('Predicted');
        let legendG = addLegend(this.PContainerSvg, '(Actual)');
        let top = parseInt(d3.select(clone).style('margin-top'));
        legendG.attr('transform', `translate(${this.margin.left}, ${top-10})`);
        // add legend for the CF panel
        let ColorLegendG = addColorLegend(this.CFContainerSvg, 'grad1');
        ColorLegendG.attr('transform', 
        `translate(${this.CFContainerSize.width- parseInt(this.CFDivSelector.style('margin-right'))+10}, ${parseInt(this.CFDivSelector.style('margin-top'))+CMDim.margin.top})`);
    }

    /*set the style of grid by coomparing the size of CFContrainer and the PContainer */
    initGrid(){
        d3.select('#confusionMtxPanel')
            .style('grid-template-columns', `${this.PContainerSize.width}px ${this.CFContainerSize.width}px`)
            .style('grid-template-rows', `40px 40px ${d3.max([this.PContainerSize.height, this.CFContainerSize.height])}px`);
    }

    /* when mouse over one part of confusion matrix, hiighlight this part and corresponding part in the var chart */
    addActions(){
        let that = this;
        let barColorCopy = '';
        let CFColorCopy = '';
        let red = '#E06666';
        this.CFDivSelector.select('svg').selectAll('rect')
            .on('mouseover', function(){
                // highlight the corresponding bar
                let className = d3.select(this).attr('class');
                barColorCopy = that.PContainerSelector.select(`.${className}`).attr('fill');
                CFColorCopy = d3.select(this).attr('fill');
                d3.select(this).attr('fill', red);
                that.PContainerSelector.select(`.${className}`)
                    .attr('fill', red);
            })
            .on('mouseout', function(){
                d3.select(this).attr('fill', CFColorCopy);
                let className = d3.select(this).attr('class');
                that.PContainerSelector.select(`.${className}`)
                    .attr('fill', barColorCopy);
            });
    }

    /* add events on the select  */
    selectChange(){
        let that = this;
        d3.select('#confusionMtxPanelContainer').select('select')
            .on('change', function(){
                let value = d3.select(this).node().value;
                console.log('the selector change!', value);
                value == 'male'? that.cloneDiv(0) : that.cloneDiv(1);
                // update the confusion matrix
                value == 'male'? visConfusionMatrixPanel(that.CFDivSelector, 0) : visConfusionMatrixPanel(that.CFDivSelector, 1);
                // add actions
                that.addActions();
            })
    }
}

function triggerConfusionMtxPanel(){
    confusionMtxPanel = new ConfusionMtxPanel();
    return d3.select("#confusionMtxPanelContainer");
}

let confusionMtxPanel = '';
