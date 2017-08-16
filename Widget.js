///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////
define([
        'dojo/_base/declare',
        'dijit/_WidgetsInTemplateMixin',
        "dojo/Deferred",
        'jimu/BaseWidget',
        'jimu/portalUtils',
        "jimu/dijit/Message",
        "jimu/SpatialReference/wkidUtils",
        'jimu/portalUrlUtils',
        "esri/layers/ArcGISDynamicMapServiceLayer",
        "esri/layers/ArcGISTiledMapServiceLayer",
        "esri/layers/VectorTileLayer",
        "esri/layers/OpenStreetMapLayer",
        'dojo/_base/lang',
        'dojo/_base/array',
        "dojo/_base/html",
        "dojo/query",
        'esri/request',
        'dojo/on',
        'dojo/promise/all',
        './utils',
        'dijit/form/HorizontalSlider',
        'dijit/form/HorizontalRuleLabels',
        'dojo/dom-construct'
    ],
    function(
        declare,
        _WidgetsInTemplateMixin,
        Deferred,
        BaseWidget,
        portalUtils,
        Message,
        SRUtils,
        portalUrlUtils,
        ArcGISDynamicMapServiceLayer,
        ArcGISTiledMapServiceLayer,
        VectorTileLayer,
        OpenStreetMapLayer,
        lang,
        array,
        html,
        query,
        esriRequest,
        on,
        all,
        utils,
        HorizontalSlider,
        HorizontalRuleLabels,
        domConstruct)
{
    var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {

        name: 'eBasemapGallery',
        baseClass: 'jimu-widget-ebasemapgallery',
        spatialRef: null,

        basemapLayers1: [],
        basemapLayers2: [],
        basemap_index_1: false,
        basemap_index_2: false,
        opacity: false,

        startup: function() {
            /*jshint unused: false*/
            this.inherited(arguments);
            this.initBasemaps();
        },

        resize: function() {
            this._responsive();
        },


        _getBasemapLayer: function(conf) {
            var type = 'ArcGISTiledMapServiceLayer';

            var types = ['ArcGISTiledMapServiceLayer', 'ArcGISDynamicMapServiceLayer', 'VectorTileLayer', 'OpenStreetMapLayer'];
            if (conf.layerType && types.indexOf(conf.layerType) > -1)
                type = types[types.indexOf(conf.layerType)];

            switch (type) {
                case 'ArcGISTiledMapServiceLayer':
                    if (!conf.url)
                        return false;
                    return new ArcGISTiledMapServiceLayer(conf.url, conf);
                    break;
                case 'ArcGISDynamicMapServiceLayer':
                    if (!conf.url)
                        return false;
                    return new ArcGISDynamicMapServiceLayer(conf.url, conf);
                    break;
                case 'VectorTileLayer':
                    if (!conf.url)
                        return false;
                    return new VectorTileLayer(conf.url, conf);
                    break;
                case 'OpenStreetMapLayer':
                    return new OpenStreetMapLayer(conf);
                    break;
            }

            return false;
        },

        _getOpacity1:function(asPercent){
          //If 2nd basemap and not merge mode, return total opacity
          if(!this.config.mergeTransparency && this.basemap_index_2 !== false)
            return (asPercent) ? 100 : 1;

          var opacity = parseInt(this.slider.getValue());
          if(this.basemap_index_2 !== false){
            opacity = 100-opacity;
          }
          return (asPercent) ? opacity : (opacity/100);
        },

        _getOpacity2:function(asPercent){
          if(this.basemap_index_2 === false)
            return undefined;
          var opacity = parseInt(this.slider.getValue());
          return (asPercent) ? opacity : (opacity/100);
        },

        //configureBasemap: function(bm1_index, bm2_index, let_opacity) {
        configureBasemap: function(bm1_index, bm2_index) {
            if (bm1_index === undefined)
                bm1_index = false;
            if (bm2_index === undefined)
                bm2_index = false;

            if (bm1_index === false)
                return false;

            //Change in baselayers if needed
            if (bm1_index !== this.basemap_index_1 || bm2_index !== this.basemap_index_2) {

                //Opacity calcul
                /*if (!let_opacity) {
                    opacity1 = 100;
                    opacity2 = (bm2_index !== false) ? 50 : 100;
                } else {
                    opacity1 = (bm2_index !== false) ? 100 : this.opacity;
                    opacity2 = (bm2_index !== false) ? this.opacity : 100;
                    // opacity2 = 100 - this.opacity;
                }*/


                // We remove actual basemaps layer from map
                for(var i=0,nb=this.basemapLayers1.length;i<nb;i++) {
                    this.map.removeLayer(this.basemapLayers1[i]);
                }
                this.basemapLayers1 = [];
                for(var i=0,nb=this.basemapLayers2.length;i<nb;i++) {
                    this.map.removeLayer(this.basemapLayers2[i]);
                }
                this.basemapLayers2 = [];



                if (bm1_index !== this.basemap_index_1 && this.basemap_index_1 !== false) {
                    //reaffiche dans available
                    if (this.basemaps[this.basemap_index_1])
                        this.basemaps[this.basemap_index_1].div.style.display = 'block';
                }
                if (bm2_index !== this.basemap_index_2 && this.basemap_index_2 !== false) {
                    //reaffiche dans available
                    if (this.basemaps[this.basemap_index_2])
                        this.basemaps[this.basemap_index_2].div.style.display = 'block';
                }

                //Configure basemap layers
                var basemap_layers = [];

                //We add baselayer 1
                //var o = opacity1 / 100;
                var insert_position = 0;
                for(var i=0,nb=this.basemaps[bm1_index]["layers"].length;i<nb;i++) {
                    var conf = this.basemaps[bm1_index]["layers"][i];
                    conf["id"] = this.id + "__1__" + i;
                    //conf["opacity"] = o;
                    conf["displayInLegend"] = false;
                    conf["showLegend"] = false;
                    conf["_basemapGalleryLayerType"] = "basemap";
                    conf["isOperationalLayer"] = false;

                    basemap_layers.push(conf);

                    //create layers
                    this.basemapLayers1[i] = this._getBasemapLayer(conf);
                    this.basemapLayers1[i]._basemapGalleryLayerType = "basemap";
                    //Add to map
                    this.map.addLayer(this.basemapLayers1[i], insert_position);
                    insert_position++;
                }
                this.basemap1_length = i + 1;

                this.basemap_index_1 = bm1_index;
                this.basemaps[this.basemap_index_1].div.style.display = 'none';

                //We add baselayer 2 (if asked)
                if (bm2_index !== false) {
                    //var o = opacity2 / 100;
                    for(var i=0,nb=this.basemaps[bm2_index]["layers"].length;i<nb;i++) {
                        var conf = this.basemaps[bm2_index]["layers"][i];
                        conf["id"] = this.id + "__2__" + i;
                        //conf["opacity"] = o;
                        conf["displayInLegend"] = false;
                        conf["showLegend"] = false;

                        basemap_layers.push(conf);

                        //create layers
                        this.basemapLayers2[i] = this._getBasemapLayer(conf);
                        this.basemapLayers2[i]._basemapGalleryLayerType = "basemap";
                        //Add to map
                        this.map.addLayer(this.basemapLayers2[i], insert_position);
                        insert_position++;
                    }
                    this.basemaps[bm2_index].div.style.display = 'none';
                }
                this.basemap_index_2 = bm2_index;

                //display in header
                this.row2basemapsNode.style.display = (this.basemap_index_2 !== false) ? 'table-row' : 'none';
                this.row1basemapNode.style.display = (this.basemap_index_2 === false) ? 'table-row' : 'none';

                //img & labels in header
                if (this.basemap_index_2 !== false) {
                    this.bm1ImgNode.src = this.basemaps[this.basemap_index_1]["thumbnailUrl"];
                    this.bm2ImgNode.src = this.basemaps[this.basemap_index_2]["thumbnailUrl"];

                    this.bm1LabelNode.innerHTML = this.basemaps[this.basemap_index_1]["title"];
                    this.bm1Node.title = this.basemaps[this.basemap_index_1]["title"];
                    this.bm2LabelNode.innerHTML = this.basemaps[this.basemap_index_2]["title"];
                    this.bm2Node.title = this.basemaps[this.basemap_index_2]["title"];
                } else {
                    this.bmImgNode.src = this.basemaps[this.basemap_index_1]["thumbnailUrl"];
                    this.bmLabelNode.innerHTML = this.basemaps[this.basemap_index_1]["title"];
                    this.bmNode.title = this.basemaps[this.basemap_index_1]["title"];
                }

                //this.slider.setValue(opacity2);
            };
            this.setOpacity(true);
            this.setSliderInfo();
        },

        setSliderInfo: function() {
            var opacity = parseInt(this.slider.getValue());

            var label = (this.basemap_index_2 !== false) ? this.nls.opacity2ndBasemap : this.nls.opacity;
            this.sliderInfo.innerHTML = label + opacity + "%";
        },

        setOpacity: function(force) {
            updateSlider = false;
            var opacity = parseInt(this.slider.getValue());

            if (this.opacity == opacity && !force)
                return;

            this.opacity = opacity;

            //Opacity calcul
            var o = this._getOpacity1();
            for(var i=0,nb=this.basemapLayers1.length;i<nb;i++){
                if (o == 0) {
                    this.basemapLayers1[i].setVisibility(false);
                    this.basemapLayers1[i].setOpacity(1);
                } else {
                    this.basemapLayers1[i].setVisibility(true);
                    this.basemapLayers1[i].setOpacity(o);
                }
            }

            if (this.basemap_index_2 !== false) {
                var o = this._getOpacity2();
                for(var i=0,nb=this.basemapLayers2.length;i<nb;i++){
                    if (o == 0) {
                        this.basemapLayers2[i].setVisibility(false);
                        this.basemapLayers2[i].setOpacity(1);
                    } else {
                        this.basemapLayers2[i].setVisibility(true);
                        this.basemapLayers2[i].setOpacity(o);
                    }
                }
            }

            //Update of slider visual
            this.setSliderInfo();
        },

        onSwitchBasemaps: function() {
            this.configureBasemap(this.basemap_index_2, this.basemap_index_1, true);
        },

        onRemoveFirst: function() {
            this.configureBasemap(this.basemap_index_2, false, false);
        },
        onRemoveSecond: function() {
            this.configureBasemap(this.basemap_index_1, false, false);
        },

        onSliderChange: function() {
            this.setOpacity();
        },

        onBmSet: function(index) {
            this.configureBasemap(index, false);
        },

        onBmAdd: function(index) {
            this.configureBasemap(this.basemap_index_1, index);
        },

        initBasemaps: function() {
            var basemapsDef;
            var portalSelfDef;

            var config = lang.clone(this.config.basemapGallery);

            if (!config.basemaps)
                config.basemaps = [];

            this.basemaps = config.basemaps;

            //load from portal or config file.
            if (config.showArcGISBasemaps || (config.showArcGISBasemaps === undefined && config.basemaps.length === 0)) {
                basemapsDef = utils._loadPortalBaseMaps(this.appConfig.portalUrl, this.map.spatialReference);

            } else {
                this._loadBasemapsInUI();
                return;
            }

            var portal = portalUtils.getPortal(this.appConfig.portalUrl);
            portalSelfDef = portal.loadSelfInfo();
            all({
                'portalSelf': portalSelfDef,
                'basemaps': basemapsDef
            }).then(lang.hitch(this, function(result) {
                var basemaps = result.basemaps;
                var i = 0;

                basemaps = array.filter(basemaps, function(basemap) {
                    var bingKeyResult;
                    var spatialReferenceResult;
                    // first, filter bingMaps
                    if (result.portalSelf.bingKey) {
                        // has bingKey, can add any bing map or not;
                        bingKeyResult = true;
                    } else if (!utils.isBingMap(basemap)) {
                        // do not have bingKey and basemap is not bingMap.
                        bingKeyResult = true;
                    } else {
                        // do not show basemap if do not has bingKey as well as basemap is bingMap.
                        bingKeyResult = false;
                    }

                    // second, filter spatialReference.
                    // only show basemaps who has same spatialReference with current map.
                    if (SRUtils.isSameSR(this.map.spatialReference.wkid,
                            basemap.spatialReference.wkid)) {
                        spatialReferenceResult = true;
                    } else {
                        spatialReferenceResult = false;
                    }

                    // basemap does not have title means basemap load failed.
                    return basemap.title && bingKeyResult && spatialReferenceResult;
                }, this);

                for(var i=0,nb=basemaps.length;i<nb;i++) {
                    this.basemaps.push(basemaps[i]);
                }

                this._loadBasemapsInUI();

            }));
        },


        _loadBasemapsInUI: function() {
            this.availableBmsNode.innerHTML = '';

            basemaps = this.basemaps;
            var webmapBasemap = this._getWebmapBasemap();

            // if basemap of current webmap is not include, so add it.
            for(var i=0,nb=basemaps.length;i<nb;i++) {
                var isBasemap = true;
                var j;
                for (j = 0,nb_layers=basemaps[i].layers.length; j < nb_layers; j++) {
                    var url1 = basemaps[i].layers[j]['url'].split("//")[1].split("?")[0];
                    var url2 = webmapBasemap.layers[j]['url'].split("//")[1].split("?")[0];
                    if (url1 != url2) {
                        isBasemap = false;
                        break;
                    }
                }

                if (isBasemap) {
                    basemaps[i]["current"] = true;
                    webmapBasemap["current"] = j;
                    break;
                }

            }
            if (webmapBasemap["current"] === undefined || webmapBasemap["current"] === false) {
                basemaps.push(webmapBasemap);
            }

            for (var i = 0, nb=basemaps.length; i < nb; i++) {
                var index = i;


                if (!basemaps[i].thumbnailUrl) {
                    basemaps[i].thumbnailUrl = this.folderUrl + "images/default.jpg";
                } else {
                    if (basemaps[i].thumbnailUrl.indexOf('http') === 0) {
                        basemaps[i].thumbnailUrl = basemaps[i].thumbnailUrl +
                            utils.getToken(this.appConfig.portalUrl);
                    } else if (basemaps[i].thumbnailUrl.startWith('/') ||
                        basemaps[i].thumbnailUrl.startWith('data')) {
                        basemaps[i].thumbnailUrl = basemaps[i].thumbnailUrl;
                    } else {
                        //if path is relative, relative to widget's folder
                        basemaps[i].thumbnailUrl = this.folderUrl + basemaps[i].thumbnailUrl;
                    }
                }

                //Add in UI !
                var html =
                    '<div style="width: 85px;" class="esriBasemapGalleryNode">' +
                    '<img src="' + basemaps[i].thumbnailUrl + '" class="esriBasemapGalleryThumbnail">' +
                    '<div class="esriBasemapGalleryLabelContainer"><span>' + basemaps[i].title + '</span></div>' +
                    '<img src="' + this.folderUrl + '/images/accept.png" title="' + this.nls.setButton + '" class="galleryBasemapAccept" onClick="dijit.byId(\'' + this.id + '\').onBmSet(' + index + ');">' +
                    '<img src="' + this.folderUrl + '/images/add.png" title="' + this.nls.addButton + '" class="galleryBasemapAdd" onClick="dijit.byId(\'' + this.id + '\').onBmAdd(' + index + ');">' +
                    '</div>';

                var style = "width:85px;";
                if (basemaps[i]["current"]) {
                    style += "display:none;"

                    this.bmImgNode.src = basemaps[i]["thumbnailUrl"];
                    this.slider.setValue(100);
                    this.bmLabelNode.innerHTML = basemaps[i]["title"];

                    this.basemap_index_1 = i;
                    this.opacity = 100;

                    //Registering initial basemaps layers in widget
                    for(var j=0, nb_l=this.map.itemInfo.itemData.baseMap.baseMapLayers.length;j<nb_l;j++){
                        var id = this.map.itemInfo.itemData.baseMap.baseMapLayers[j]["id"];
                        if (id === undefined || id === false)
                            continue;
                        var layer = this.map.getLayer(id);
                        if (layer)
                            this.basemapLayers1.push(layer);
                    }
                }

                // +'<img class="searchNoumeaImgRight" src="'+this._getThemeImgPath(conf, cf_th)+'" />';
                var div = dojo.create(
                    "div", {
                        style: style,
                        innerHTML: html,
                        className: "esriBasemapGalleryNode"
                    },
                    this.availableBmsNode
                );
                basemaps[i]["div"] = div;
            }
            this.basemaps = basemaps;
        },

        _getWebmapBasemap: function() {
            var thumbnailUrl;
            if (this.map.itemInfo.item.thumbnail) {
                thumbnailUrl = portalUrlUtils.getItemUrl(this.appConfig.portalUrl,
                    this.map.itemInfo.item.id) + "/info/" + this.map.itemInfo.item.thumbnail;
            } else {
                thumbnailUrl = null;
            }
            return {
                title: this.map.itemInfo.itemData.baseMap.title,
                thumbnailUrl: thumbnailUrl,
                layers: this.map.itemInfo.itemData.baseMap.baseMapLayers,
                spatialReference: this.map.spatialReference
            };
        },

        _responsive: function() {
            // the default width of esriBasemapGalleryNode is 85px,
            // margin-left is 10px, margin-right is 10px;
            var paneNode = query('#' + this.id)[0];
            var width = html.getStyle(paneNode, 'width');
            var column = parseInt(width / 105, 10);
            if (column > 0) {
                var margin = width % 105;
                var addWidth = parseInt(margin / column, 10);
                query('.esriBasemapGalleryNode', this.id).forEach(function(node) {
                    html.setStyle(node, 'width', 85 + addWidth + 'px');
                });
            }
        }

    });

    return clazz;
});
