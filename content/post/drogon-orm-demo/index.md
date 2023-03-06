---
title: C++ ORM with Drogon
subtitle: Object-Relational Mapping with modern C++ and PostgreSQL

# Summary for listings and search engines
summary: In this post I explain how to use the Object-Relational Mapping (ORM) mechanism provided by the Drogon C++ server framework. Drogon is a C++ framework for developing HTTP applications. It provides an ORM system that maps database tables to C++ object classes. The post shows how to set up a database schema for a space travel company with tables for planets, spacecraft, flights, and tickets as an example.

# Link this post with a project
projects: [cavoke]

# Date published
date: '2023-03-06T00:00:00Z'

# Date updated
lastmod: '2023-03-06T00:00:00Z'

# Is this an unpublished draft?
draft: true

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
## Introduction

In this repository we shall try out
the [Object-Relational Mapping](https://en.wikipedia.org/wiki/Object%E2%80%93relational_mapping) (
ORM) mechanism provided by
the [Drogon](https://github.com/drogonframework/drogon) C++ server framework.

### What is Drogon

Drogon is a modern C++14/17-based HTTP application framework with 8k stars on GitHub. The main
advantages include:

* Provide a completely asynchronous programming mode
* Support JSON format request and response, very friendly to the Restful API application development
* Support file download and upload
* Support non-blocking I/O based asynchronously reading and writing database (PostgreSQL and MySQL(
  MariaDB) database)
* Support plugins which can be installed by the configuration file at load time
* Support C++ coroutines
* Provide a convenient lightweight ORM implementation that supports for regular object-to-database
  bidirectional mapping

We are of course particularly interested in the last mentioned point.

### Example setting

Now let's define what we will try to implement for our demo.

Let's imagine we live in the (not so) distant future where interplanetary travel is common practice.
Hence, our database will contain the information of one such space travel company.

We will have four entities:

* **Planets** with the following fields:
  * Planet `id` in the database
  * Planet `name`
  * Planet `distance` from the sun (in millions of km)

  Example: `(3, 'Earth', 150)`
* **Spacecrafts** with the following fields:
  * Spacecraft `id` in the database
  * Spacecraft `name`
  * Spacecraft `capacity`

  Example: `(5, 'Aurora', 10)`
* **Flights** with the following fields:
  * Flight number (`num`)
  * Destination planet id (`planet_id`)
  * Used spacecraft id (`spacecraft_id`)

  Example: `(1300, 3, 5)`
* **Tickets** with the following fields:
  * Flight number (`flight_num`)
  * Passenger name (`pax_name`)
  * Ticket `price`

  Example: `(1300, 'John', 100)`

This model can be expressed through the following Entity Relationship Model (ERM):
![ERM](https://github.com/waleko/demo_orm_drogon/blob/master/.github/diagram.png?raw=true)

## ORM

You can read about Drogon ORM in its [documentation](https://github.com/drogonframework/drogon/wiki/ENG-08-3-DataBase-ORM).

### Code generation

Now we are ready to start. The main particularity of the Drogon ORM is that instead of configuring
entity layout in the code and adapting the database accordingly (like most ORMs like Django,
Hibernate do), Drogon ORM generates **entity classes based on the database schema**.
This is due to the fact that C++ currently has no reflection mechanism.

Therefore, our database schema can be found in
the [`resources/postgres-init.sql`](resources/postgres-init.sql) file.

Once we have set up the database, we can generate entities classes using `drogon_ctl`. Just
run `drogon_ctl create model model`, this will regenerate all the files in the `./model` directory.
If the tool can't connect to the database, check that correct configuration is in
the [`model/modle.json`](model/model.json) file.

### Using entities classes

Now we can see the power of ORM in the [`src/SimpleController.cc`](src/SimpleController.cc) file
with all the handlers.

Assume we want to implement three methods:

1. Get the list of all tickets
2. Get the information about a flight, its corresponding destination planet and used spacecraft
   by the flight number.
3. Add new spacecraft to the database

#### All tickets
Usually we would have to execute a simple query something like:
```postgresql
select * from tickets;
```
But then somehow retrieve the result. With an ORM we can do it easier:
```c++
// ...
auto dbClient = drogon::app().getDbClient();
auto ticketMapper = Mapper<Tickets>(dbClient);

std::vector<Tickets> allTickets = ticketMapper.findAll();
```
We now have a vector of tickets, exactly what we have wanted!

#### Complete flight information

This is not so fun doing with queries. You will have to use something like this:
```postgresql
select * from flights where num = ?;
select s.* from spacecrafts s join flights f on s.id = f.spacecraft_id where f.num = ?;
select p.* from planets p join flights f on p.id = f.planet_id where f.num = ?;
```

With an ORM we can write:
```c++
// ...
auto dbClient = drogon::app().getDbClient();
auto flightMapper = Mapper<Flights>(dbClient);

auto flight = flightMapper.findByPrimaryKey(search_flight_num);
flight.getSpacecrafts(dbClient, /* callback */, /* error handling */);
flight.getPlanets(dbClient, /* callback */, /* error handling */);
```

> Note: `getSpacecrafts` is in plural form, only because the table name is `spacecrafts`.

#### Add new spacecraft
Query version:
```postgresql
insert into spacecrafts values (?, ?, ?);
```

ORM version:
```c++
// ...

auto dbClient = drogon::app().getDbClient();
auto spacecraftMapper = Mapper<Spacecrafts>(dbClient);

spacecraftMapper.insert(spacecraftReq, /* callback */, /* error handling */);
```

### Full list of methods
![drogon ORM full1](https://github.com/drogonframework/drogon/wiki/images/mapper_method1_en.png)
![drogon ORM full2](https://github.com/drogonframework/drogon/wiki/images/mapper_method2_en.png)
