---
title: C++ ORM with Drogon
subtitle: Object-Relational Mapping with modern C++ and PostgreSQL

# Summary for listings and search engines
summary: Embark on a comprehensive exploration of Object-Relational Mapping (ORM) using Drogon, the cutting-edge C++ server framework. Discover how Drogon's dynamic entity class generation and intuitive mapping streamline complex database interactions, ushering in a new era of seamless integration between C++ applications and relational databases.

# Link this post with a project
projects: [cavoke]

# Date published
date: '2023-03-06T00:00:00Z'

# Date updated
lastmod: '2023-08-09T00:00:00Z'

# Is this an unpublished draft?
draft: false

# Show this page in the Featured widget?
featured: false
# Featured image
# Place an image named `featured.jpg/png` in this page's folder and customize its options here.
image:
  caption: 'Image credit: [**Unsplash**](https://unsplash.com/photos/woWf_VJ7dNs)'
  focal_point: ''
  placement: 1
  preview_only: true

authors:
  - admin

categories:
  - Tutorials

---
## Exploring Object-Relational Mapping with Drogon: A Practical Example

Welcome to this blog post, where we delve into the fascinating realm of Object-Relational Mapping (ORM) using the robust Drogon C++ server framework. Our journey will unravel the mechanics of Drogon's ORM, allowing us to seamlessly bridge the gap between objects and databases. Let's begin!

### Introducing Drogon

Drogon stands as a beacon of modernity in the realm of C++14/17-based HTTP application frameworks. With an impressive 8k stars on GitHub, Drogon boasts a plethora of advantages, including:

- Enabling a fully asynchronous programming paradigm.
- Facilitating seamless integration with JSON format for requests and responses, a boon for Restful API development.
- Providing support for file upload and download operations.
- Harnessing non-blocking I/O for asynchronous database operations (with PostgreSQL and MySQL/MariaDB).
- Offering a plugin system for effortless integration of additional features via configuration files.
- Embracing C++ coroutines to simplify complex asynchronous code.

Of special interest to us is Drogon's lightweight and intuitive ORM implementation. This ORM prowess forms the focal point of our exploration.

### Setting the Stage

Let's set the scene for our practical endeavor. Envision a world where interplanetary travel has become an everyday affair. In this context, our database will house the data of a pioneering space travel company. Our database schema comprises four essential entities:

1. **Planets**: Containing details such as `id`, `name`, and `distance` from the sun (in millions of km).
2. **Spacecrafts**: With attributes like `id`, `name`, and `capacity`.
3. **Flights**: Comprising `num`, `planet_id`, and `spacecraft_id`.
4. **Tickets**: Encompassing `flight_num`, `pax_name`, and `price`.

Here's a concrete example for each entity:

- Planet Example: `(3, 'Earth', 150)`
- Spacecraft Example: `(5, 'Aurora', 10)`
- Flight Example: `(1300, 3, 5)`
- Ticket Example: `(1300, 'John', 100)`

The visual representation of this model takes the form of an Entity Relationship Model (ERM):
![Entity Relationship Model (ERM)](https://github.com/waleko/demo_orm_drogon/blob/master/.github/diagram.png?raw=true)

## The Power of Drogon ORM

### Unveiling Drogon ORM

Drogon ORM's capabilities are extensively documented [here](https://github.com/drogonframework/drogon/wiki/ENG-08-3-DataBase-ORM).

### Code Generation Made Easy

Let's dive into action. Unlike conventional ORMs that require manual entity configuration and database adaptation, Drogon ORM employs a unique approach. It dynamically generates entity classes based on the database schema. This approach is necessitated by C++'s current lack of a reflection mechanism.

Our database schema resides in the [`resources/postgres-init.sql`](resources/postgres-init.sql) file. Once the database setup is complete, entity classes can be generated using `drogon_ctl`. A simple command like `drogon_ctl create model model` regenerates files within the `./model` directory. Ensure the [`model/model.json`](model/model.json) file contains accurate configuration if any connection issues arise.

### Harnessing Entity Classes

Let's now witness the prowess of Drogon ORM through the [`src/SimpleController.cc`](src/SimpleController.cc) file, housing a slew of handlers.

Our objective revolves around three methods:

1. Fetching a list of all tickets.
2. Retrieving flight information, along with its corresponding destination planet and spacecraft, based on the flight number.
3. Adding a new spacecraft to the database.

#### Fetching All Tickets

Ordinarily, retrieving a simple query result involves considerable effort. For instance, a PostgreSQL query like `select * from tickets;` must be executed, followed by the retrieval of results. Drogon ORM simplifies this process significantly:

```c++
// ...
auto dbClient = drogon::app().getDbClient();
auto ticketMapper = Mapper<Tickets>(dbClient);

std::vector<Tickets> allTickets = ticketMapper.findAll();
```

The result? A vector of tickets, precisely as desired!

#### Comprehensive Flight Information

In scenarios involving complex queries, the burden intensifies. A task like retrieving flight details, associated destination planets, and used spacecrafts might entail multiple queries. For instance:

```postgresql
select * from flights where num = ?;
select s.* from spacecrafts s join flights f on s.id = f.spacecraft_id where f.num = ?;
select p.* from planets p join flights f on p.id = f.planet_id where f.num = ?;
```

Drogon ORM's elegance shines through in comparison:

```c++
// ...
auto dbClient = drogon::app().getDbClient();
auto flightMapper = Mapper<Flights>(dbClient);

auto flight = flightMapper.findByPrimaryKey(search_flight_num);
flight.getSpacecrafts(dbClient, /* callback */, /* error handling */);
flight.getPlanets(dbClient, /* callback */, /* error handling */);
```

> Note: `getSpacecrafts` adopts plural form due to the `spacecrafts` table name.

#### Adding a New Spacecraft

The contrast remains palpable even when inserting new data. A conventional PostgreSQL `insert` query:

```postgresql
insert into spacecrafts values (?, ?, ?);
```

In the ORM realm, Drogon offers a cleaner, more intuitive solution:

```c++
// ...
auto dbClient = drogon::app().getDbClient();
auto spacecraftMapper = Mapper<Spacecrafts>(dbClient);

spacecraftMapper.insert(spacecraftReq, /* callback */, /* error handling */);
```

### A Glimpse of the Rich Toolbox

Explore Drogon ORM's complete array of methods:
![Drogon ORM Methods - Part 1](https://github.com/drogonframework/drogon/wiki/images/mapper_method1_en.png)
![Drogon ORM Methods - Part 2](https://github.com/drogonframework/drogon/wiki/images/mapper_method2_en.png)

In conclusion, Drogon's ORM unlocks an avenue of efficiency, simplifying the interaction between objects and databases. As we've witnessed through our interplanetary travel database example, Drogon ORM's code generation and entity mapping streamline database operations, granting developers more time to focus on innovation. Dive into Drogon ORM's world – a bridge between the realms of C++ and databases, propelling your application development to new heights.
