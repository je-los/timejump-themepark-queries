-- ONLY RUN THESE COMMANDS IF EMPLOYEE TABLE IS EMPTY

drop table if exists employee;

create table employee(
	employeeID int PRIMARY KEY,
    name varchar(99),
    salary float,
    role int,
    start_date date,
    end_date date,
    email varchar(60)
);