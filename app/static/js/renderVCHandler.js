/**
 * - directly render a single visual component
 * - deliver a visual component set to another class
 * @param {*} vcJSON {} / [{}, ...] a or a list of VC json for the visual component
 * @param {*} setPosition num; If this visual component belongs to a Visual set, num represents the position of this VC in this set
 * @param {*} setPosition object; If this visual component belongs to a Visual set, then VCSet represent the object
 */
async function renderVC(vcJSON, setPosition = -1, VCSet = ''){
    let vcName = vcJSON['name'];
    let type = '';
    let returnObj = '';    // the object of each visual component / visual component set
    if(vcName == 'Table'){
        await renderVCTable();
    }
    switch(vcName){
        case 'LRExplainer':
            returnObj = await new LRExplainerPanel('LRExplainerTP', setPosition, VCSet);
            break;
        case 'CustomizeData':
            returnObj = await new EditPanel('customizationTP', setPosition, VCSet);
            break;
        case 'MLPipeline':
            let trainData = vcJSON['trainData'];
            let model = vcJSON['model'];
            returnObj = await new TrainAndTestPanel('MLPipelineTP', trainData, model, setPosition, VCSet);            
            break;
        case 'FairMetrics':
            type = vcJSON['data'];
            returnObj = await new FairMetricsPanel('fairMetricsTP', type, vcJSON['metrics'], vcJSON['interaction'], setPosition, VCSet);
            break;
        case 'PreProcess':
            type = vcJSON['type'];
            returnObj = await new PreProcessPanel('preProcessTP', type, setPosition, VCSet);
            break;
        case 'PostProcess':
            type = vcJSON['type'];
            returnObj = await new PostProcessPanel('postProcessTP', type, setPosition, VCSet);
            break;
    }
    return returnObj;
}

// show a subset of data in a table
async function renderVCTable(){
    let tabelData = '';
    await axios.post('/getTabelData')
        .then((response)=>{
            tabelData = response.data;
        })
        .catch((error)=>{
            console.log(error);
            return;
        });
    renderChapterObj.renderTable(tabelData);
}