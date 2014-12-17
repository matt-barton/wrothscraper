
DELIMITER '$$$';

DROP PROCEDURE IF EXISTS PostCountByUser$$$
CREATE PROCEDURE PostCountByUser(IN rows INT)
BEGIN
	IF (rows IS NULL) THEN
		SET rows = 9999;
	END IF;
	SELECT u.Username, COUNT(p.PostId) AS 'Posts'
	  FROM User u
	  JOIN Post p
	    ON p.UserId = u.UserId
	 GROUP BY p.UserId
	 ORDER BY Posts DESC
	 LIMIT rows;
END$$$

CREATE PROCEDURE RemovePost(IN postId INT)
BEGIN
	DELETE FROM WordInPost WHERE PostId = postId;
	DELETE FROM Post WHERE PostId = postId;
END $$$

DELIMITER ;



