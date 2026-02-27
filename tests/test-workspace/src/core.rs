pub struct Data {
    pub value: i32,
}

impl Data {
    pub fn new() -> Self {
        Data { value: 0 }
    }

    pub fn process(&mut self) {
        self.value += 1;
    }
}
