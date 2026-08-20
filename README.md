# Trust Tai Studio

We are building Trust Tai Studio at studio.trusttai.com.

Studio is not a standalone app. It is one room inside the existing Trust Tai Suite and must visually, architecturally, and behaviorally feel like part of the same operating system.

1. Preserve the Trust Tai Suite (https://lovable.dev/projects/65944e34-ede5-4757-befb-870e1ff97444)

Use the existing Trust Tai Suite as the source of truth for:

global navigation

sidebar proportions

header

spacing

typography

border radius

card treatments

colors

icons

responsive behavior

authentication

organization context

user profile

permissions

shared activity architecture



Studio should use the existing Trust Tai logo and favicon already available in the project.

Do not introduce a second Studio-specific logo.



2. Product Definition

Trust Tai Studio is the creative production room of the Trust Tai Suite.

Its job is to turn real thinking, experiences, insights, ideas, projects, recordings, and company signals into high-quality creative work such as:

LinkedIn posts

newsletters

blog posts

Substack articles

images

visual stories

cinematic short films

social content

Studio is not:

an engineering workspace

a project management system

a generic social scheduler

Canva

Buffer

a prompt library

a complicated video editor

The product should feel simple because an artificial intelligence layer does the heavy creative work behind the scenes.

3. Core Product Model

The governing hierarchy is:

Truth → Story → Scenes → Assets → Formats → Channels

Every important piece of content begins as a Story, not as a LinkedIn post, newsletter, or video.

A single Story may eventually become:

LinkedIn post

newsletter

blog article

image

carousel

cinematic film

short clip

The channel is an output, not the starting point.

4. Studio AI

Studio should have one clear artificial intelligence layer called:

Studio AI

Internally it may perform several roles, but the user should experience one intelligence.

Studio AI behaves like a:

Creative Director

Story Editor

Film Director

Production Executive

Content Strategist

Studio AI should eventually be responsible for:

understanding source material

identifying the deeper human truth

finding the strongest story angle

drafting written content

developing visual metaphors

creating story treatments

breaking films into scenes

directing scene progression

maintaining continuity between scenes

preparing production instructions

generating assets through external creative engines

reviewing drafts

learning from corrections

The UI should never make the user manage multiple agents.

5. World System

Every Studio belongs to an organization and should have an Active World.

A World governs how that company's creative work should feel.

For Trust Tai, the active World is:

The Trust Tai World
World of Living Roads
Canon v1.0

The World system will eventually contain:

World Bible

philosophy

emotional language

visual language

characters

locations

symbols

lighting rules

camera language

reference images

approved scenes

anti-drift rules

creative memory

For now, create the architecture and UI placeholders needed to support this cleanly.



The underlying relationship should support:

Organization → Studio → Active World → Stories → Assets

6. V1 Navigation

Keep Studio intentionally simple.

Inside Studio, the V1 should revolve around:

Home

Creative command center.

Create

Where a user brings an idea, recording, note, link, Suite signal, or source material.

Library

All approved and in-progress creative work.

In Production

Stories and films currently being developed.

Approvals

Work waiting for human review.

World

The active creative universe and its governing references.

Do not create a large number of additional top-level pages yet.

Advanced functionality should be progressively disclosed inside these experiences.

7. Build the Studio Home Screen First

For this first implementation, build Studio Home.

The screen should answer:

What matters creatively right now, and how quickly can I begin creating?

Use the design direction from the approved Studio Home concept, but adapt it fully to the existing Trust Tai Suite shell.

Do not create a separate Studio sidebar if the Suite already provides navigation.

The existing Suite navigation remains the primary shell.

Studio Home Structure

Opening

A spacious opening area.

Headline:

What story shall we bring to life today?

Supporting text:

Start with an idea, experience, recording, project insight, or something you noticed. Studio AI will help find the story worth telling.

Use Trust Tai's premium editorial typography.

Do not make this feel like an AI chatbot landing page.

Primary Creation Input

Create one large, calm input area.

Placeholder:

Share an idea, paste something, upload a recording, or bring in a signal from Trust Tai.

Supporting actions:

Add text

Voice note

Upload

From Suite

Paste link

Primary action:

Create with Studio AI

This should feel like the main action on the entire page.

Quick Outputs

Below the input, show simple choices:

LinkedIn Post

Newsletter

Blog Article

Visual Story

Cinematic Film

Make it clear these are possible outputs from a Story, not separate disconnected tools.

In Production

Show a visually strong set of current Story cards.

Example content:

Movement Is Not Progress

Cinematic Film
5 of 7 scenes ready

What Founders Carry

Newsletter
Ready for approval

The Roadmap Perspective

Blog Article
Drafting

Cards should use visual thumbnails or approved world imagery.

Keep status easy to understand.

Avoid excessive metadata.

Signals From the Suite

Create a small section showing that Studio receives opportunities from other Trust Tai rooms.

Examples:

Completed Project
Potential case study

Roadmap Insight
Potential thought leadership story

Recurring Question from Comms
Potential educational content

Founder Insight from Steward
Potential story opportunity

These are read-only signals.

Studio does not take ownership of the original source record.

Active World

Studio Home should clearly but quietly show:

Active World

The Trust Tai World
World of Living Roads
Canon v1.0

Include:

View World

The user should always know which World is governing the current creative work.

8. Visual Direction

The interface must feel like the existing Trust Tai Suite first.

Then elevate the Studio room with a slightly more editorial and cinematic feel.

Use:

existing Trust Tai brand colors

existing Suite blue

warm whites

deep navy / charcoal

premium serif typography for important editorial moments

clean sans serif for interface controls

generous whitespace

restrained borders

intentional imagery

clean grid

calm interaction states

Avoid:

purple AI gradients

neon

excessive glow

cyberpunk visuals

generic AI sparkles everywhere

overly rounded consumer-app UI

dense dashboards

excessive analytics

stock photography energy

Studio should feel:

premium, thoughtful, spacious, quietly confident and intentionally creative.

9. Technical Foundation

Build Studio as part of the existing Suite architecture.

Reuse shared:

authentication

organizations

users

permissions

layout

navigation

components

design tokens

Do not duplicate Suite infrastructure.

Prepare the data architecture so we can later connect Supabase entities such as:

studios

worlds

stories

story_sources

story_outputs

scenes

assets

approvals

creative_feedback

Do not overbuild the database yet.

Create only what is required for this initial screen and architecture.

10. External Integrations

We will integrate:

Runway for creative image/video production

ChatGPT/OpenAI for Studio AI intelligence

Supabase for shared data and persistence

additional services only when they clearly improve the workflow

Do not create fake Runway or OpenAI functionality.

Do not hardcode API keys.

Create clean service boundaries/placeholders where these integrations will later connect.

Runway will be a production engine, not Studio's creative brain.

Studio AI will determine what should be made and how it should be directed.

Runway will help produce the assets.

11. Outcome

For this first pass I want:

Studio correctly established as a Trust Tai Suite room.

Existing Suite branding and shell preserved.

Studio Home implemented at a production-quality level.

The Active World concept visible.

The Create entry point working as a UI flow.

In Production stories represented clearly.

Suite Signals represented cleanly.

Architecture ready for the next Studio screens and future Supabase, OpenAI, and Runway integrations.

Do not build the entire product yet.

Do not invent additional features.

Do not turn Studio into a traditional content dashboard.

Focus on making Studio Home a 10/10 foundation for the creative production system we are building.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9bc06c0a-b783-4353-ab9b-7f645e1d9a9a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
