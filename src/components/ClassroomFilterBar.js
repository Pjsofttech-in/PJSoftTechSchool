import React, { Component } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView,
  Modal, FlatList, StyleSheet,
} from 'react-native';
import MatIcon from '@react-native-vector-icons/material-design-icons';
import { teacherApi } from '@api/teacherApi';

const PRIMARY = '#7b68ee';

// Hardcoded Institute Type 
const INSTITUTE_DEF = {
  key: 'instituteType',
  label: 'Institute',
  icon: 'office-building-outline',
  hardcoded: ['School', 'College'],
};

// API-driven static filters
const STATIC_FILTER_DEFS = [
  { key: 'academicYear', label: 'Year',     icon: 'calendar-range',      fetchFn: (e) => teacherApi.getAcademicYears(e), valueKey: 'academicYear' },
  { key: 'medium',       label: 'Medium',   icon: 'translate',            fetchFn: (e) => teacherApi.getMediums(e),       valueKey: 'mediumName'   },
  { key: 'stream',       label: 'Stream',   icon: 'school-outline',       fetchFn: (e) => teacherApi.getStreams(e),        valueKey: 'stream'       },
  { key: 'division',     label: 'Division', icon: 'alpha-d-box-outline',  fetchFn: (e) => teacherApi.getDivisions(e),     valueKey: 'divisionName' },
  { key: 'standard',     label: 'Standard', icon: 'book-open-variant',    fetchFn: (e) => teacherApi.getStandards(e),     valueKey: 'standardName' },
];

// Dependent filter descriptors
const GRADUATION_DEF = {
  key: 'graduationType',
  label: 'Graduation',
  icon: 'school',
  valueKey: 'graduationType',
  // We also need the raw id when this value is picked (to fetch degree names)
  idKey: 'id',
};

const DEGREE_DEF = {
  key: 'degreeName',
  label: 'Degree',
  icon: 'certificate-outline',
  valueKey: 'degreeName',
};

export class ClassroomFilterBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // Loaded option arrays
      options: {
        academicYear: [], medium: [], stream: [],
        division: [], standard: [],
        graduationType: [],
        degreeName: [],
      },
      // (null = "All" / not set)
      selected: {
        instituteType: null,
        academicYear: null, medium: null, stream: null,
        graduationType: null, degreeName: null,
        division: null, standard: null,
      },
      // The raw numeric id of the selected graduation type
      selectedGraduationTypeId: null,

      openFilter: null,
      loadingGrad: false,
      loadingDegree: false,
    };
  }

  componentDidMount() {
    this._loadStaticOptions();
  }

  _loadStaticOptions = async () => {
    const { email } = this.props;
    const updates = {};
    await Promise.all(
      STATIC_FILTER_DEFS.map(async (def) => {
        try {
          const data = await def.fetchFn(email);
          updates[def.key] = Array.isArray(data) ? data : [];
        } catch {
          updates[def.key] = [];
        }
      })
    );
    this.setState((prev) => ({ options: { ...prev.options, ...updates } }));
  };

  // Selection handler
  /**
   * @param filterKey   the filter being changed
   * @param value       display string to store (null = "All")
   * @param rawItem     the full API object for this item (used to grab idKey)
   */
  _selectOption = (filterKey, value, rawItem = null) => {
    this.setState(
      (prev) => {
        const next = { ...prev.selected, [filterKey]: value };
        let nextGradId = prev.selectedGraduationTypeId;

        if (filterKey === 'stream') {
          // Downstream resets
          next.graduationType = null;
          next.degreeName = null;
          nextGradId = null;
        }

        if (filterKey === 'graduationType') {
          // Downstream reset
          next.degreeName = null;
          nextGradId = rawItem ? rawItem[GRADUATION_DEF.idKey] : null;
        }

        return {
          selected: next,
          selectedGraduationTypeId: nextGradId,
          openFilter: null,
        };
      },
      async () => {
        const { email } = this.props;

        // Fetch graduation types when stream is set
        if (filterKey === 'stream') {
          if (value) {
            this.setState({ loadingGrad: true });
            try {
              const data = await teacherApi.getGraduationTypes(email, value);
              this.setState((prev) => ({
                options: { ...prev.options, graduationType: Array.isArray(data) ? data : [], degreeName: [] },
                loadingGrad: false,
              }));
            } catch {
              this.setState((prev) => ({
                options: { ...prev.options, graduationType: [], degreeName: [] },
                loadingGrad: false,
              }));
            }
          } else {
            // Stream cleared — wipe both dependent lists
            this.setState((prev) => ({
              options: { ...prev.options, graduationType: [], degreeName: [] },
            }));
          }
        }

        // Fetch degree names when graduationType is set
        if (filterKey === 'graduationType') {
          const gradId = this.state.selectedGraduationTypeId;
          if (gradId) {
            this.setState({ loadingDegree: true });
            try {
              const data = await teacherApi.getDegreeNames(email, gradId);
              this.setState((prev) => ({
                options: { ...prev.options, degreeName: Array.isArray(data) ? data : [] },
                loadingDegree: false,
              }));
            } catch {
              this.setState((prev) => ({
                options: { ...prev.options, degreeName: [] },
                loadingDegree: false,
              }));
            }
          } else {
            // graduationType cleared
            this.setState((prev) => ({
              options: { ...prev.options, degreeName: [] },
            }));
          }
        }

        this._notifyParent();
      }
    );
  };

  _clearFilter = (filterKey) => {
    this._selectOption(filterKey, null, null);
  };

  _clearAll = () => {
    const cleared = {};
    [INSTITUTE_DEF, ...STATIC_FILTER_DEFS, GRADUATION_DEF, DEGREE_DEF].forEach(
      (d) => (cleared[d.key] = null)
    );
    this.setState(
      (prev) => ({
        selected: cleared,
        selectedGraduationTypeId: null,
        options: { ...prev.options, graduationType: [], degreeName: [] },
      }),
      () => { if (this.props.onApply) this.props.onApply({}); }
    );
  };

  _notifyParent = () => {
    if (!this.props.onApply) return;
    const params = {};
    Object.entries(this.state.selected).forEach(([k, v]) => {
      if (v !== null) params[k] = v;
    });
    this.props.onApply(params);
  };

  _getActiveCount = () =>
    Object.values(this.state.selected).filter((v) => v !== null).length;

  // Chip renderer
  _renderChip = (key, label, icon) => {
    const { selected } = this.state;
    const isActive = selected[key] !== null;

    return (
      <TouchableOpacity
        key={key}
        style={[styles.chip, isActive && styles.chipActive]}
        onPress={() => this.setState({ openFilter: key })}
        activeOpacity={0.75}
      >
        <MatIcon name={icon} size={13} color={isActive ? '#fff' : PRIMARY} />
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
          {isActive ? selected[key] : label}
        </Text>
        {isActive ? (
          <TouchableOpacity
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            onPress={(e) => { e.stopPropagation(); this._clearFilter(key); }}
          >
            <MatIcon name="close-circle" size={14} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        ) : (
          <MatIcon name="chevron-down" size={14} color={PRIMARY} />
        )}
      </TouchableOpacity>
    );
  };

  _renderLoadingChip = (label) => (
    <View key={`loading-${label}`} style={styles.loadingChip}>
      <MatIcon name="loading" size={13} color="#aaa" />
      <Text style={styles.loadingChipText}>{label}...</Text>
    </View>
  );

  // Picker modal data builder
  /**
   * Returns { listData, getDisplay, getId } for the currently open filter.
   * listData    — array to pass to FlatList (prepended with an "All" sentinel)
   * getDisplay  — fn(item) → display string
   * getId       — fn(item) → raw item (for dependent filters that need the full object)
   */
  _getPickerConfig = (openFilter) => {
    const { options } = this.state;

    if (openFilter === INSTITUTE_DEF.key) {
      return {
        listData: [{ _all: true }, ...INSTITUTE_DEF.hardcoded.map((v) => ({ value: v }))],
        getDisplay: (item) => (item._all ? 'All' : item.value),
        getRaw: (item) => null,
      };
    }

    if (openFilter === GRADUATION_DEF.key) {
      return {
        listData: [{ _all: true }, ...options.graduationType],
        getDisplay: (item) => (item._all ? 'All' : item[GRADUATION_DEF.valueKey]),
        getRaw: (item) => (item._all ? null : item),
      };
    }

    if (openFilter === DEGREE_DEF.key) {
      return {
        listData: [{ _all: true }, ...options.degreeName],
        getDisplay: (item) => (item._all ? 'All' : item[DEGREE_DEF.valueKey]),
        getRaw: (item) => null,
      };
    }

    const def = STATIC_FILTER_DEFS.find((d) => d.key === openFilter);
    if (def) {
      return {
        listData: [{ _all: true }, ...options[def.key]],
        getDisplay: (item) => (item._all ? 'All' : item[def.valueKey]),
        getRaw: (item) => null,
      };
    }

    return null;
  };

  _getPickerTitle = (openFilter) => {
    if (openFilter === INSTITUTE_DEF.key)  return `Filter by ${INSTITUTE_DEF.label}`;
    if (openFilter === GRADUATION_DEF.key) return `Filter by ${GRADUATION_DEF.label}`;
    if (openFilter === DEGREE_DEF.key)     return `Filter by ${DEGREE_DEF.label}`;
    const def = STATIC_FILTER_DEFS.find((d) => d.key === openFilter);
    return def ? `Filter by ${def.label}` : '';
  };

  // Render
  render() {
    const {
      selected, openFilter, loadingGrad, loadingDegree,
    } = this.state;
    const activeCount = this._getActiveCount();
    const pickerConfig = openFilter ? this._getPickerConfig(openFilter) : null;

    return (
      <View style={[styles.wrapper, this.props.style]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Clear-all chip */}
          {activeCount > 0 && (
            <TouchableOpacity
              style={styles.clearAllChip}
              onPress={this._clearAll}
              activeOpacity={0.75}
            >
              <MatIcon name="filter-remove-outline" size={14} color="#f44336" />
              <Text style={styles.clearAllText}>Clear ({activeCount})</Text>
            </TouchableOpacity>
          )}

          {/* 1. Institute Type — hardcoded, always visible */}
          {this._renderChip(INSTITUTE_DEF.key, INSTITUTE_DEF.label, INSTITUTE_DEF.icon)}

          {/* 2. Academic Year */}
          {this._renderChip('academicYear', 'Year', 'calendar-range')}

          {/* 3. Medium */}
          {this._renderChip('medium', 'Medium', 'translate')}

          {/* 4. Stream */}
          {this._renderChip('stream', 'Stream', 'school-outline')}

          {/* 5. Graduation Type — appears after stream picked */}
          {selected.stream && !loadingGrad &&
            this._renderChip(GRADUATION_DEF.key, GRADUATION_DEF.label, GRADUATION_DEF.icon)}
          {loadingGrad && this._renderLoadingChip('Graduation')}

          {/* 6. Degree Name — appears after graduation type picked */}
          {selected.graduationType && !loadingDegree &&
            this._renderChip(DEGREE_DEF.key, DEGREE_DEF.label, DEGREE_DEF.icon)}
          {loadingDegree && this._renderLoadingChip('Degree')}

          {/* 7. Division */}
          {this._renderChip('division', 'Division', 'alpha-d-box-outline')}

          {/* 8. Standard */}
          {this._renderChip('standard', 'Standard', 'book-open-variant')}
        </ScrollView>

        {/* Picker Modal */}
        <Modal
          visible={!!openFilter}
          transparent
          animationType="fade"
          onRequestClose={() => this.setState({ openFilter: null })}
        >
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => this.setState({ openFilter: null })}
          >
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>
                  {this._getPickerTitle(openFilter)}
                </Text>
                <TouchableOpacity onPress={() => this.setState({ openFilter: null })}>
                  <MatIcon name="close" size={22} color="#555" />
                </TouchableOpacity>
              </View>

              {pickerConfig && (
                <FlatList
                  data={pickerConfig.listData}
                  keyExtractor={(item, index) =>
                    item._all ? '__all__' : index.toString()
                  }
                  renderItem={({ item }) => {
                    const displayVal = pickerConfig.getDisplay(item);
                    const isSelected = item._all
                      ? selected[openFilter] === null
                      : selected[openFilter] === displayVal;

                    return (
                      <TouchableOpacity
                        style={[styles.optionRow, isSelected && styles.optionRowActive]}
                        onPress={() =>
                          this._selectOption(
                            openFilter,
                            item._all ? null : displayVal,
                            pickerConfig.getRaw(item)
                          )
                        }
                      >
                        <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                          {displayVal}
                        </Text>
                        {isSelected && (
                          <MatIcon name="check-circle" size={18} color={PRIMARY} />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                  contentContainerStyle={{ paddingBottom: 20 }}
                />
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }
}

const styles = StyleSheet.create({ 
  wrapper: { backgroundColor: '#fff', paddingVertical: 8, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, },
  scrollContent: { paddingHorizontal: 14, gap: 8, flexDirection: 'row', alignItems: 'center', },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f0eeff', borderWidth: 1, borderColor: `${PRIMARY}33`, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY, },
  chipText: { fontSize: 12, color: PRIMARY, fontFamily: 'Poppins-Regular', },
  chipTextActive: { color: '#fff', fontFamily: 'Poppins-Medium', },
  clearAllChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff0f0', borderWidth: 1, borderColor: '#f4433633', },
  clearAllText: { fontSize: 12, color: '#f44336', fontFamily: 'Poppins-Regular', },
  loadingChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e0e0e0', },
  loadingChipText: { fontSize: 12, color: '#aaa', fontFamily: 'Poppins-Regular', },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', },
  pickerSheet: { backgroundColor: '#fff', borderRadius: 20, width: '82%', maxHeight: '60%', paddingTop: 16, paddingHorizontal: 4, elevation: 12, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', marginBottom: 4, },
  pickerTitle: { fontSize: 16, fontFamily: 'Poppins-Medium', color: '#1a1a2e', },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 13, borderRadius: 10, marginHorizontal: 6, },
  optionRowActive: { backgroundColor: '#f0eeff', }, 
  optionText: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#333', },
  optionTextActive: { fontFamily: 'Poppins-Medium', color: PRIMARY, },
  separator: { height: 1, backgroundColor: '#f5f5f5', marginHorizontal: 14, },
});

export default ClassroomFilterBar;