---
title: 'Development of a GPS-coordinates correction system for live broadcasting of orienteering competitions using the Kalman filter on Kotlin'

# Authors
# If you created a profile for a user (e.g. the default `admin` user), write the username (folder name) here
# and it will be replaced with their full name and linked to their profile.
authors:
  - admin
  - Mark Ipatov
  - Mikhail Senin

# Author notes (optional)
author_notes:
  - 'Equal contribution'
  - 'Equal contribution'
  - 'Scientific director'

date: '2020-12-30T00:00:00Z'
doi: ''

# Schedule page publish date (NOT publication's date).
publishDate: ''

# Publication type.
# Legend: 0 = Uncategorized; 1 = Conference paper; 2 = Journal article;
# 3 = Preprint / Working Paper; 4 = Report; 5 = Book; 6 = Book section;
# 7 = Thesis; 8 = Patent
publication_types: ['7']

# Publication name and optional abbreviated publication name.
publication: In research conference at *Academic lyceum "Physical-Technical High School" named after Zh. I. Alfyorov*
publication_short:

abstract: "Many sports (for example, sailing, multi-racing, various marathons and orienteering) do not allow spectators to constantly watch the athletes. To increase entertainment and control, trackers are used, the data from which is shown to viewers in real time. However, when conducting such online broadcasts, the organizers face the problem of inaccurate display of the position of the athlete. This can make it difficult for viewers to follow the dynamics of the event. The goal of our work is to create a correction system that will correctly display the location of the athlete using a specific model for a particular sport. Our work is devoted to methods of correction for orienteering. To achieve the goal, we implemented and compared several correction methods: naive pulling the athlete to the road, Kalman filter, hybrid options. As a result, one of our hybrid options turned out to be 36% more accurate than the naive one. However, further improvement of this correction algorithm is possible."

# Summary. An optional shortened abstract.
summary: 

tags: [School]

# Display this page in the Featured widget?
featured: true

# Custom links (uncomment lines below)
# links:
# - name: Custom Link
#   url: http://example.org

url_pdf: ''
url_code: ''
url_dataset: ''
url_poster: ''
url_project: ''
url_slides: ''
url_source: ''
url_video: ''

# Featured image
# To use, add an image named `featured.jpg/png` to your page's folder.
image:
  caption: 'Image credit: [**Unsplash**](https://unsplash.com/photos/_pH4sKRfgYY)'
  focal_point: ''
  preview_only: false

# Associated Projects (optional).
#   Associate this publication with one or more of your projects.
#   Simply enter your project's folder or file name without extension.
#   E.g. `internal-project` references `content/project/internal-project/index.md`.
#   Otherwise, set `projects: []`.
projects:
  - ogps_corrector

# Slides (optional).
#   Associate this publication with Markdown slides.
#   Simply enter your slide deck's filename without extension.
#   E.g. `slides: "example"` references `content/slides/example/index.md`.
#   Otherwise, set `slides: ""`.
slides: ''
---
