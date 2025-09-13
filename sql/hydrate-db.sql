-- Enable Ad Hoc Distributed Queries (if not already enabled)
-- Required for OPENROWSET(BULK ...)
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
EXEC sp_configure 'Ad Hoc Distributed Queries', 1;
RECONFIGURE;

-- Read entire JSON file into a variable
DECLARE @json NVARCHAR(MAX);

SELECT @json = BulkColumn
-- Update with the data file location
FROM OPENROWSET (BULK 'C:\data\seasons.json', SINGLE_CLOB) as j;

------------------------------------------------------
-- Insert Seasons
------------------------------------------------------
INSERT INTO Seasons (Year)
SELECT DISTINCT [key] AS Year
FROM OPENJSON(@json, '$.seasons')
WHERE TRY_CAST([key] AS INT) IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM Seasons s WHERE s.Year = TRY_CAST([key] AS INT));

------------------------------------------------------
-- Insert Tiers dynamically (tier1, tier2, etc.)
------------------------------------------------------
INSERT INTO Tiers (TierName)
SELECT DISTINCT [key]
FROM OPENJSON(@json, '$.seasons.1888')  -- sample season
WHERE NOT EXISTS (SELECT 1 FROM Tiers t WHERE t.TierName = [key]);

------------------------------------------------------
-- Insert Teams + League Tables
------------------------------------------------------
DECLARE @seasonId INT, @tierId INT, @year INT, @tierName NVARCHAR(50);

-- Loop through each season
DECLARE season_cursor CURSOR FOR
SELECT [key]
FROM OPENJSON(@json, '$.seasons');

OPEN season_cursor;
FETCH NEXT FROM season_cursor INTO @year;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Get SeasonId
    SELECT @seasonId = SeasonId FROM Seasons WHERE Year = @year;

    -- Loop tiers inside this season
    DECLARE tier_cursor CURSOR FOR
    SELECT [key]
    FROM OPENJSON(@json, CONCAT('$.seasons."', @year, '"'));

    OPEN tier_cursor;
    FETCH NEXT FROM tier_cursor INTO @tierName;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- Ensure tier exists
        IF NOT EXISTS (SELECT 1 FROM Tiers WHERE TierName = @tierName)
            INSERT INTO Tiers (TierName) VALUES (@tierName);

        SELECT @tierId = TierId FROM Tiers WHERE TierName = @tierName;

        -- Get all rows in this tier
        INSERT INTO Teams (TeamName)
        SELECT DISTINCT JSON_VALUE(value, '$.team')
        FROM OPENJSON(@json, CONCAT('$.seasons."', @year, '"."', @tierName, '".table'))
        WHERE JSON_VALUE(value, '$.team') IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM Teams t WHERE t.TeamName = JSON_VALUE(value, '$.team')
        );

        -- Insert League Table rows
        INSERT INTO LeagueTables (
            SeasonId, TierId, TeamId,
            Pos, Played, Won, Drawn, Lost,
            GoalsFor, GoalsAgainst, GoalDifference, GoalAverage, Points, Notes,
            WasRelegated, WasPromoted, IsExpansionTeam, WasReElected, WasReprieved
        )
        SELECT
            @seasonId,
            @tierId,
            (SELECT TeamId FROM Teams WHERE TeamName = JSON_VALUE(value, '$.team')),
            JSON_VALUE(value, '$.pos'),
            JSON_VALUE(value, '$.played'),
            JSON_VALUE(value, '$.won'),
            JSON_VALUE(value, '$.drawn'),
            JSON_VALUE(value, '$.lost'),
            JSON_VALUE(value, '$.goalsFor'),
            JSON_VALUE(value, '$.goalsAgainst'),
            JSON_VALUE(value, '$.goalDifference'),
            JSON_VALUE(value, '$.goalAverage'),
            JSON_VALUE(value, '$.points'),
            JSON_VALUE(value, '$.notes'),
            JSON_VALUE(value, '$.wasRelegated'),
            JSON_VALUE(value, '$.wasPromoted'),
            JSON_VALUE(value, '$.isExpansionTeam'),
            JSON_VALUE(value, '$.wasReElected'),
            JSON_VALUE(value, '$.wasReprieved')
        FROM OPENJSON(@json, CONCAT('$.seasons."', @year, '"."', @tierName, '".table'));

        FETCH NEXT FROM tier_cursor INTO @tierName;
    END;

    CLOSE tier_cursor;
    DEALLOCATE tier_cursor;

    FETCH NEXT FROM season_cursor INTO @year;
END;

CLOSE season_cursor;
DEALLOCATE season_cursor;
