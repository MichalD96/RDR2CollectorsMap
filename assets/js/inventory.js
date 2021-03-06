const Inventory = {
  init: function () {
    $('#enable-inventory-menu-update').prop("checked", InventorySettings.isMenuUpdateEnabled);
    $('#enable-inventory-popups').prop("checked", InventorySettings.isPopupsEnabled);
    $('#enable-inventory').prop("checked", InventorySettings.isEnabled);
    $('#highlight_low_amount_items').prop("checked", InventorySettings.highlightLowAmountItems);
    $('#inventory-container').toggleClass("opened", InventorySettings.isEnabled);
    $('#inventory-stack').val(InventorySettings.stackSize);
    $('#soft-flowers-inventory-stack').val(InventorySettings.flowersSoftStackSize);
    $('#reset-collection-updates-inventory').prop("checked", InventorySettings.resetButtonUpdatesInventory);
    $('#auto-enable-sold-items').prop("checked", InventorySettings.autoEnableSoldItems);
    $('#reset-inventory-daily').prop("checked", InventorySettings.resetInventoryDaily);
    $('#enable-additional-inventory-options').prop("checked", InventorySettings.enableAdvancedInventoryOptions);


    // disable dropdown menu if highlight low amount items is disabled:
    $('[data-help="highlight_style"]').toggleClass('disabled', !InventorySettings.highlightLowAmountItems);
    $('#highlight_low_amount_items').on('change', function () {
      $('[data-help="highlight_style"]').toggleClass('disabled', !InventorySettings.highlightLowAmountItems);
    });
  },

  updateItemHighlights: function myself(fromTimer) {
    'use strict';
    if (!InventorySettings.isEnabled || !InventorySettings.highlightLowAmountItems) return;

    if (fromTimer) {
      delete myself.timer;
    } else {
      if (!myself.timer) {
        myself.timer = setTimeout(myself, 0, true);
      }
      return;
    }
    Collection.collections.forEach(collection => {
      if (['arrowhead', 'coin', 'fossils_random', 'heirlooms_random', 'jewelry_random'].includes(collection.category)) return;

      const contourImg = $(`[data-marker*=${collection.category}] img.marker-contour`);
      contourImg.removeClass(function (index, className) {
        return (className.match(/highlight-low-amount-items-\S+/gm) || []).join(' ');
      });
      contourImg.css('--animation-target-opacity', 0.0);
      contourImg.css("opacity", 0.0);

      if (!enabledCategories.includes(collection.category)) return;

      const markers = MapBase.markers.filter(_m => _m.category === collection.category && _m.isCurrent);

      const collectionAverage = collection.averageAmount();
      markers.map(_m => {
        _m.updateColor();

        if (!_m.canCollect) return;

        const weight = Math.max(0, ((collectionAverage - _m.item.amount) /
          InventorySettings.stackSize));
        const scaledWeight = Math.min(1, weight * 2.4);

        const contourImg = $(`[data-marker=${_m.text}] img.marker-contour`);
        if (weight < 0.02) {
          contourImg.css('opacity', 0.0);
        } else if (weight < 0.3 || InventorySettings.highlightStyle === 'static') {
          contourImg.css('opacity', scaledWeight);
        } else {
          contourImg.css('--animation-target-opacity', scaledWeight);
          contourImg.addClass(`highlight-low-amount-items-animated`);
        }
      });
    });
  },

  changeMarkerAmount: function (legacyItemId, changeAmount, skipInventory = false) {
    const sameItemMarkers = MapBase.markers.filter(marker => marker.legacyItemId === legacyItemId);

    const item = Item.items.find(i => i.legacyItemId === legacyItemId);
    if (item && (!skipInventory || skipInventory && InventorySettings.isMenuUpdateEnabled)) {
      item.amount += changeAmount;
    }

    sameItemMarkers.forEach(marker => {
      if (!InventorySettings.isEnabled) return;

      const popup = marker.lMarker && marker.lMarker.getPopup();
      if (popup) popup.update();

      const amount = marker.item && marker.item.amount;
      if ((marker.isCollected ||
        (InventorySettings.isEnabled && amount >= InventorySettings.stackSize)) &&
        marker.isCurrent ||
        (marker.category === 'flower' && amount >= InventorySettings.flowersSoftStackSize)) {
        $(`[data-marker=${marker.text}]`).css('opacity', Settings.markerOpacity / 3);
        $(`[data-type=${marker.legacyItemId}] .collectible-text p`).addClass('disabled');
      } else if (marker.isCurrent) {
        $(`[data-marker=${marker.text}]`).css('opacity', Settings.markerOpacity);
        $(`[data-type=${marker.legacyItemId}] .collectible-text p`).removeClass('disabled');
      }

      if (marker.isCurrent && ['egg', 'flower'].includes(marker.category)) {
        $(`[data-type=${marker.legacyItemId}] .collectible-text p`).toggleClass('disabled',
          sameItemMarkers.filter(m => m.cycleName === marker.cycleName).every(m => !m.canCollect));
      }

      Menu.refreshCollectionCounter(marker.category);
    });

    if ($("#routes").val() == 1)
      Routes.drawLines();

    Inventory.updateItemHighlights();
    Menu.refreshItemsCounter();
  }
};