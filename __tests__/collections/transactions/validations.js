const validations = (fields, fieldName) => new Promise((resolve, reject) => {
  resolve({...fields, validationsField: true});
});

export { validations };