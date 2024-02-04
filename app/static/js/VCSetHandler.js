/**
 * The object of a set of visual components
 *      - store a list of VC
 *      - coordination between different kinds of visual components
 */
class VCSet{
    /**
     * @param {*} contentLst [{}, {}, ...] a list of visual components, text, figures, etc 
     */
    constructor(contentLst){
        this.VCLst = [];
        this.contentLst = contentLst;
        this.data = {
            confusionMatrixData: '',
            trainData: {'Original': '', 'Reweighing': '', 'LFR': '', 'OptimPreproc': ''},
            testData: ''
        }
    }

    // visualize each item in the content
    async init(){
        let VCCnt = 0;
        for(let i = 0; i < this.contentLst.length; i++){
            let item = this.contentLst[i];
            let type = item['type'];        // the type of this node
            let content = item['content'];

            switch(type){
                case 'text':
                case 'box':
                    renderChapterObj.renderText(type, content);
                    break;
                case 'table':
                    renderChapterObj.renderTable(content);
                    break;
                case 'refer':
                    renderChapterObj.renderRefer(content);
                    break;
                case 'figure':
                    renderChapterObj.renderFig(content);
                    break;
                case 'visualComponent':
                    let vcObj = await renderVC(content, VCCnt, this);
                    if(vcObj){this.VCLst.push(vcObj); VCCnt+=1}
                    break;
            }
        }
    }

    /**
     * activate a specific visual component
     * @param {*} name the name of the visual component already activated
     * @param {*} index  the index of the visual component in the VCLst
     */
    activateCompo(name, index){
        let VCObj = '';     // VC to be activated
        switch(name){
            case 'customization':
                VCObj = this.findVC('MLPipeline', index);
                if(VCObj){VCObj.activate('', '', true);}
                break;
            case 'MLPipeline':
                VCObj = this.findVC('FairMetrics', index);
                if(VCObj){VCObj.activate();}
                break;
            case 'PreProcess':
                VCObj = this.findVC('MLPipeline', index);
                if(VCObj){VCObj.activate();}
                break;
            case 'PostProcess':
                VCObj = this.findVC('FairMetrics', index);
                if(VCObj){VCObj.activate();}
                break;
        }
    }

    /**
     * find the visaul component called 'name' in the VC set, where the index of it > index
     * @param {*} name  
     * @param {*} index 
     */
    findVC(name, index){
        for(let i = index+1; i < this.VCLst.length; i++){
            let VCObj = this.VCLst[i];
            if(VCObj.name == name){
                return VCObj;
            }
        }
        return '';
    }
}