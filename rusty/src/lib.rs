mod utils;

mod plate_math;

use plate_math::{determine_plate_combos, determine_plates, determine_weight_space, Plate};
use wasm_bindgen::prelude::*;

// #[wasm_bindgen]
// extern "C" {
//     fn alert(s: &str);
// }

#[wasm_bindgen]
pub fn wasm_determine_plates(
    target: Option<f64>,
    handle: Option<f64>,
    plates: &JsValue,
) -> Vec<f64> {
    // Use serde_wasm_bindgen::from_value for deserialization
    let plates: Vec<Plate> =
        serde_wasm_bindgen::from_value(plates.clone()).unwrap_or_else(|_| vec![]);

    determine_plates(target, handle, &plates)
}

#[wasm_bindgen]
pub fn wasm_determine_plate_combos(plates: &[f64]) -> Vec<f64> {
    determine_plate_combos(plates, 0)
}

#[wasm_bindgen]
pub fn wasm_determine_weight_space(handle: Option<f64>, plates: &[f64]) -> Vec<f64> {
    determine_weight_space(handle, plates)
}
