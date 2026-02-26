mod core;
mod utils;

use crate::core::Data;

pub fn main_loop(d: &mut Data) {
    d.process();
}
pub mod database_layer;
