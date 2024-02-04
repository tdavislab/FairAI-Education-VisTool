/**
 * the entry piont of the tool
 */

const colorMap = {
    lightgrey: '#C9C9C9',
    grey: '#A5A5A5',
    blackblue: '#525252',
    lightblackblue: '#8497B0',
    llightblackblue: '#ADB9CA',
    lightblue: '#8497B0',
    blue: '#4472C4',   // #8397B0 #4472C4
    orange: '#ED7D32',  // #F4B183 #ED7D32
    darkblue: '#44546A',
    red: '#C00000',
};

let initiation = '';      // the object of Initiation
let renderChapterObj = '';   // the chapter rendering handler

// render the side nav and the content of first chapter
function activateWeb(){
    axios.post('/init')
        .then((response)=>{
            let data = response.data;   // return title list and first chapter
            let chapterTitleLst = data['titles'];
            let chapterContent = data['firstChapter'];
            d3.select("body").style("visibility", "visible");
            renderChapterObj = new RenderChapterHandler();
            initiation = new Initiation(chapterTitleLst);
            isFinalProject = false;
            renderChapterObj.renderChapter(chapterContent, 1);     // render the first chapter content
        })
        .catch((error)=>{
            console.log(error);
        });
}

activateWeb();