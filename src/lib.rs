extern crate image;
mod utils;
use wasm_bindgen::prelude::*;
use std::io::Cursor;
use image::{ImageBuffer,Rgba};
use image::io::Reader;

type BufFormat = ImageBuffer<Rgba<u8>, Vec<u8>>;

#[wasm_bindgen]
pub struct JsPayLoad{
    width: u32,
    height: u32,
    ptr: *const u8,
}
#[wasm_bindgen]
impl JsPayLoad{
    pub fn get_buff_ptr(&self)->*const u8 {self.ptr}
    pub fn get_width(&self)->u32         {self.width}
    pub fn get_height(&self)->u32        {self.height}
    pub fn new()->JsPayLoad{
        JsPayLoad{
            width:  0,
            height: 0,
            ptr:    std::ptr::null(),
        }
    }
}

#[wasm_bindgen]
pub struct Context {
    input_buffer: BufFormat
}

#[wasm_bindgen]
impl Context {
    pub fn new(raw_input:&[u8])->Context{
        utils::set_panic_hook();

        let reader = Reader::new(Cursor::new(raw_input))
        .with_guessed_format().expect("Cursor io never fails");
        let input_buffer = reader.decode().unwrap().into_rgba8();
        Context{
            input_buffer,
        }
    }
    pub fn refresh(&self,payload:&mut JsPayLoad){
        log!("here {} , {}",self.input_buffer.width(),self.input_buffer.height());
        
        payload.width   =  self.input_buffer.width();
        payload.height  =  self.input_buffer.height();
        payload.ptr     =  self.input_buffer.as_raw().as_ptr();        
    }
    pub fn logout_sample_pixels(&self){
        for pixel in self.input_buffer.pixels().enumerate(){//(0..40).step_by(4)
            let (i,val) = pixel;
            log!(
            "pixel[{}] = {},{},{},{}",i,val[0],val[1],val[2],val[3]
            );
            if i == 30 {break;}
          
        }
    }
}
//impl Context{
//
//}