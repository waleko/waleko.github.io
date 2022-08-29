---
# An instance of the Contact widget.
widget: contact

# This file represents a page section.
headless: true

# Order that this section appears on the page.
weight: 130

title: Contact Me
subtitle:

content:
  # Automatically link email and phone or display as text?
  autolink: true

  # Email form provider
  form:
    provider: formspree
    formspree:
      id: mbjblkwo
    netlify:
      # Enable CAPTCHA challenge to reduce spam?
      captcha: false

  # Contact details (edit or remove options as required)
  email: inbox@alexkovrigin.me
 # phone:
 # address:
 # coordinates:
 # directions: 
 # office_hours:
 # appointment_url: 'https://calendly.com'
  contact_links:
    - icon: telegram
      icon_pack: fab
      name: Telegram
      link: 'https://t.me/waleko'

design:
  columns: '2'
---
