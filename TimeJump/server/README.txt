To run server side, make sure to change directory in a terminal to server folder
Then run {node .\server.js}

To create a query and connect it to the server side
Go to MySQL Workbench and open a Query file/tab
```
CREATE PROCEDURE {name of procedure} //{sp_name()} is a common starter to the function
BEGIN
    -- Query --
END
```

If there is an error:
```
DELIMITER $$

CREATE PROCEDURE {name of procedure} //{sp_name()} is a common starter to the function
BEGIN
    -- Query --
END$$

DELIMITER ;
```