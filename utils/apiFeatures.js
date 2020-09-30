class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludeFiles = ['page', 'sort', 'limit', 'fields'];
    excludeFiles.forEach(el => delete queryObj[el]);

    //Advancd Filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    this.query = this.query.find(JSON.parse(queryStr));
    return this; // this line of line return entire object
  }

  sort() {
    if (this.queryString.sort) {
      const querySort = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(querySort);
    } else {
      this.query = this.query.sort('-price'); // so the newest on apper
    }
    return this;
  }

  limitFileds() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;
