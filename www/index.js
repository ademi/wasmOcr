
import {app} from "./displayer"
async function load_sample_img(){
    const blob = await (await fetch('http://localhost:8080/ocr_example.png')).blob();//leaves.jpeg
    //display_img(blob)
    app.init(blob)
}
let display_img = (blob)=>{
    const dom_img = document.getElementById("sample_img");
    dom_img.src = URL.createObjectURL(blob)
}

load_sample_img();

