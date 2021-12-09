# FloorPlanMaker
## See it

This repository is forked from https://github.com/furnishup/blueprint3d/

This is a customizable application built on three.js that allows users to design an interior space such as a home or apartment.

## Developing and Running Locally

To get started, clone the repository and ensure you npm installed, then run:

    npm update
    npm run-script build

The latter command generates `example/js/blueprint3d.js` from `src`.

To run the code, you open a port in regard to the sever side and go to `example` directory.

## Directory Structure

### `src/` Directory

The `src` directory contains the core of the project. Here is a description of the various sub-directories:

`floorplanner` - 2D view/controller for editing the floorplan

`items` - Various types of items that can go in rooms

`model` - Data model representing both the 2D floorplan and all of the items in it

`three` - 3D view/controller for viewing and modifying item placement

`utils` - some shared functions that are mostly deprecated in favor of functionality provided by various npm modules
