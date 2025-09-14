-- Drop if exists (for reruns)
IF OBJECT_ID('dbo.Standings', 'U') IS NOT NULL DROP TABLE dbo.Standings;
IF OBJECT_ID('dbo.SeasonLeagues', 'U') IS NOT NULL DROP TABLE dbo.SeasonLeagues;
IF OBJECT_ID('dbo.Leagues', 'U') IS NOT NULL DROP TABLE dbo.Leagues;
IF OBJECT_ID('dbo.Seasons', 'U') IS NOT NULL DROP TABLE dbo.Seasons;
IF OBJECT_ID('dbo.Teams', 'U') IS NOT NULL DROP TABLE dbo.Teams;
GO

CREATE TABLE Teams (
    TeamId INT IDENTITY PRIMARY KEY,
    Name NVARCHAR(200) NOT NULL UNIQUE
);

CREATE TABLE Seasons (
    SeasonId INT IDENTITY PRIMARY KEY,
    [Year] INT NOT NULL UNIQUE
);

CREATE TABLE Leagues (
    LeagueId INT IDENTITY PRIMARY KEY,
    Name NVARCHAR(200) NOT NULL,
    Tier INT NOT NULL
);

CREATE TABLE SeasonLeagues (
    SeasonLeagueId INT IDENTITY PRIMARY KEY,
    SeasonId INT NOT NULL FOREIGN KEY REFERENCES Seasons(SeasonId),
    LeagueId INT NOT NULL FOREIGN KEY REFERENCES Leagues(LeagueId)
);

CREATE TABLE Standings (
    StandingId INT IDENTITY PRIMARY KEY,
    SeasonLeagueId INT NOT NULL FOREIGN KEY REFERENCES SeasonLeagues(SeasonLeagueId),
    TeamId INT NOT NULL FOREIGN KEY REFERENCES Teams(TeamId),
    Position INT NOT NULL,
    Played INT NOT NULL,
    Won INT NOT NULL,
    Drawn INT NOT NULL,
    Lost INT NOT NULL,
    GoalsFor INT NOT NULL,
    GoalsAgainst INT NOT NULL,
    GoalDifference INT NULL,
    GoalAverage DECIMAL(6,3) NULL,
    Points INT NOT NULL,
    Notes NVARCHAR(MAX) NULL,
    WasRelegated BIT NOT NULL DEFAULT 0,
    WasPromoted BIT NOT NULL DEFAULT 0,
    IsExpansionTeam BIT NOT NULL DEFAULT 0,
    WasReElected BIT NOT NULL DEFAULT 0,
    WasReprieved BIT NOT NULL DEFAULT 0
);
GO
