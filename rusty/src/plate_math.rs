#[derive(Clone, serde::Deserialize)]
pub struct Plate {
    pub weight: f64,
    pub count: u16,
}

pub fn determine_plates(target: Option<f64>, handle: Option<f64>, plates: &[Plate]) -> Vec<f64> {
    if target.is_none() || handle.is_none() || plates.is_empty() {
        return vec![];
    }

    let target = target.unwrap();
    let handle = handle.unwrap();
    let mut plates_needed = Vec::new();
    let mut weight_left = (target - handle) / 2.0;

    let mut i = plates.len() - 1;
    let mut weight = plates[i].weight;
    let mut count = plates[i].count;

    while weight_left > 0.0 {
        if weight <= weight_left {
            plates_needed.push(weight);
            weight_left -= weight;
        }
        if count == 1 {
            if i == 0 {
                break;
            }
            i -= 1;
            weight = plates[i].weight;
            count = plates[i].count;
        } else {
            count -= 1;
        }
    }

    plates_needed
}

pub fn determine_plate_combos(plates: &[f64], pivot: usize) -> Vec<f64> {
    if pivot >= plates.len() {
        return vec![0.0];
    }

    let plate = plates[plates.len() - 1 - pivot];
    let loaded = 2.0 * plate;

    let loads = determine_plate_combos(plates, pivot + 1);
    let new_loads: Vec<f64> = loads.iter().map(|&l| l + loaded).collect();
    merge(&loads, &new_loads)
}

pub fn determine_weight_space(handle: Option<f64>, plates: &[f64]) -> Vec<f64> {
    if handle.is_none() {
        return vec![];
    }

    let handle = handle.unwrap();
    let mut weights = determine_plate_combos(plates, 0);
    for weight in &mut weights {
        *weight += handle;
    }
    weights
}

fn merge(a: &[f64], b: &[f64]) -> Vec<f64> {
    let mut ai = 0;
    let mut bi = 0;
    let mut result = Vec::with_capacity(a.len() + b.len());

    while ai < a.len() && bi < b.len() {
        let diff = a[ai] - b[bi];
        if diff <= 0.0 {
            result.push(a[ai]);
            ai += 1;
            if diff == 0.0 {
                bi += 1;
            }
        } else {
            result.push(b[bi]);
            bi += 1;
        }
    }

    while ai < a.len() {
        result.push(a[ai]);
        ai += 1;
    }

    while bi < b.len() {
        result.push(b[bi]);
        bi += 1;
    }

    result
}
