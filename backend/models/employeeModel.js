const db = require('../config/db');

const getAll = async () => {
    const sql = ` 
        SELECT employeeID, name, role, start_date, end_date, email
        FROM employee;
        `;

    const [rows] = await db.query(sql);
    return rows
};

const getById = async (id) => {
    const sql = `
        SELECT * FROM employee
        WHERE employeeID = ?;
    `;

    const [rows] = await db.query(sql, [id]);
    return rows[0];
}
const create = async (employeeData) => {
  const { 
    name, 
    salary, 
    role, 
    start_date, 
    end_date, 
    email
  } = employeeData;

  const sql = `
    INSERT INTO employee 
      (name, salary, role, start_date, end_date, email) 
    VALUES 
      (?, ?, ?, ?, ?, ?);
  `;
  
  const [result] = await db.query(sql, [
    name, 
    salary, 
    role, 
    start_date, 
    end_date, 
    email
  ]);
  
  // Return the ID of the new attraction
  return { id: result.insertId, ...employeeData };
};

const update = async (id, employeeData) => {
  const { 
    name, 
    salary, 
    role, 
    start_date, 
    end_date, 
    email
  } = employeeData;

  const sql = `
    UPDATE employee 
    SET 
      name = ?, 
      salary = ?, 
      role = ?, 
      start_date = ?, 
      end_date = ?, 
      email = ?
    WHERE 
      employeeID = ?;
  `;
  
  const [result] = await db.query(sql, [
    name, 
    salary, 
    role, 
    start_date, 
    end_date, 
    email,
    id
  ]);
  
  return result;
};

const remove = async (id) => {
  const sql = `
    DELETE FROM employee 
    WHERE employeeID = ?;
  `;
  
  const [result] = await db.query(sql, [id]);
  return result;
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};