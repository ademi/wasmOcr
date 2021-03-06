extern crate image;
mod utils;
use wasm_bindgen::prelude::*;
use std::io::Cursor;
use image::{ImageBuffer,Rgba,DynamicImage ,imageops::FilterType};
use image::io::Reader;

#[wasm_bindgen]
pub struct JsPayLoad{
    width: u32,
    height: u32,
    ptr: *const u8,
}
#[wasm_bindgen]
impl JsPayLoad{
    pub fn get_buff_ptr(&self)  ->*const u8 {self.ptr   }
    pub fn get_width(&self)     ->u32       {self.width }
    pub fn get_height(&self)    ->u32       {self.height}
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
    original_img: DynamicImage, //BufFormat
    width: u32,
    height: u32,
    displayed_width : u32,
    displayed_height: u32,
}

#[wasm_bindgen]
impl Context {
    pub fn new(raw_input:&[u8])->Context{
        utils::set_panic_hook();

        let reader = Reader::new(Cursor::new(raw_input))
            .with_guessed_format().expect("Error reading Buffer");
        let buffer = reader.decode().unwrap();
        let w =buffer.as_rgba8().unwrap().width();
        let h =buffer.as_rgba8().unwrap().height();
        Context{
            original_img: buffer,
            width:        w,
            height:       h,
            displayed_width : w,
            displayed_height : h,
        }
    }
    pub fn refresh(&self,payload:&mut JsPayLoad){
        //log!("here {} , {}",self.original_img.width(),self.original_img.height());
        let o_buffer    =  self.original_img.to_rgba8();
        payload.width   =  o_buffer.width();
        payload.height  =  o_buffer.height();
        payload.ptr     =  o_buffer.as_raw().as_ptr();        
    }
    pub fn logout_sample_pixels(&self){
        for pixel in self.original_img.to_rgba8().pixels().enumerate(){//(0..40).step_by(4)
            let (i,val) = pixel;
            log!(
            "pixel[{}] = {},{},{},{}",i,val[0],val[1],val[2],val[3]
            );
            if i == 30 {break;}
          
        }
    }
    pub fn resize(&mut self, ratio:f32 ,payload:&mut JsPayLoad){
        let resized = self.original_img.resize(
            (self.displayed_width as f32 *ratio ) as u32,
            (self.displayed_height as f32 *ratio) as u32,
            FilterType::Lanczos3
        ).to_rgba8();
        payload.width   =  resized.width();
        payload.height  =  resized.height();
        payload.ptr     =  resized.as_raw().as_ptr();  
    }
}