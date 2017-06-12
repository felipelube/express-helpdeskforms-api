const slug = require("slug");

config = {
  customValidators: {
    isSlug: (value) =>{
      try{
        return slug(value) === value;
      } catch(e) {
        return false;
      }
    }
  },
}

module.exports = config;