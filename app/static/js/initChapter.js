/**
 * 1. init side navigation
 * 2. click on the title on the left, jump to that page
 */
class Initiation{
    constructor(chapterTitleLst){
        this.chapterTitleLst = chapterTitleLst;     // ['title1', 'title2', 'title3', ...]
        this.renderSideNav();
    }

    /**
     * - render the side navigation with the chapterTitleLst 
     * - bind onlick event on each title
     */
    renderSideNav(){
        d3.select('#sideNavDiv').selectAll('a')
            .data(this.chapterTitleLst).enter().append('a')
            .classed("nav-text", true)
            .attr("id", d => d.replace(/[^a-zA-Z0-9]/g, ""))
            .html((d, i)=>i+1 +'. '+d)
            .on('click', (_, d)=>{
                d3.selectAll(".nav-text").classed("selected", false);
                d3.select(`#${d.replace(/[^a-zA-Z0-9]/g, "")}`).classed("selected", true);
                this.renderChapterHandler(d);
            })
            .on("mouseover", (_, d)=>{
                d3.selectAll(".nav-text").classed("mouseon", false);
                d3.select(`#${d.replace(/[^a-zA-Z0-9]/g, "")}`).classed("mouseon", true);
            })
            .on("mouseout", ()=>{
                d3.selectAll(".nav-text").classed("mouseon", false);
            });

        if(this.chapterTitleLst.length > 0){
            d3.select(`#${this.chapterTitleLst[0].replace(/[^a-zA-Z0-9]/g, "")}`).classed("selected", true);
        }
    }

    // fetch the chapter content accoring to chapter name, then render this chapter
    async renderChapterHandler(chapterName){
        let chapterId = this.chapterTitleLst.indexOf(chapterName)+1;
        let chapterJSON = {};
        await axios.post('/getChapter', {
            id: chapterId 
        }).then((response)=>{
            chapterJSON = response.data;
            renderChapterObj.renderChapter(chapterJSON, chapterId);
            isFinalProject = chapterId==5? true:false;
        });
    }
}