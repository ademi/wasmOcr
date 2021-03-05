import { Context,JsPayLoad } from "wasm-game-of-life";
import { memory } from "wasm-game-of-life/wasm_game_of_life_bg";
import {displayer} from "./displayer"
async function load_sample_img(){
    const blob = await (await fetch('http://localhost:8080/ocr_example.png')).blob();//
    //display_img(blob)
    read_img_to_buf(blob)
}
let display_img = (blob)=>{
    const dom_img = document.getElementById("sample_img");
    dom_img.src = URL.createObjectURL(blob)
}

const App = {
    Context:null,
    Initiated: function(){
        this.Context.refresh(this.payload);
        let payload = {
            width:this.payload.get_width(),
            height: this.payload.get_height(),
            data: new Uint8Array(memory.buffer, this.payload.get_buff_ptr(), this.payload.get_width() * this.payload.get_height()*4)
        }
        displayer.init(payload)
        //viewer.init(payload);
        //viewer.refresh(payload)

    }

}
let read_img_to_buf=(buf)=>{
    let reader = new FileReader();
    reader.onload = (event)=>{
        let raw = new Uint8Array(event.target.result)
        App['Context']= Context.new(raw);
        App['payload']= JsPayLoad.new();
        App.Initiated()
    }
    reader.readAsArrayBuffer(buf);
    
}

load_sample_img();