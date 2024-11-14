import React, { useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    Button,
    View,
} from 'react-native';

// 日期格式化函数
const dateRegex = new RegExp('^\\d\\d\\d\\d-\\d\\d-\\d\\d');
function jsonDateReviver(key, value) {
    if (value === null || value === undefined) return value;
    if (dateRegex.test(value)) return new Date(value);
    return value;
}

// GraphQL Fetch 函数
async function graphQLFetch(query, variables = {}) {
    try {
        console.log("GraphQL Query:", query);
        console.log("Variables:", variables);

        const response = await fetch('http://10.0.2.2:3000/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables }),
        });
        
        const body = await response.text();
        const result = JSON.parse(body, jsonDateReviver);

        if (result.errors) {
            const error = result.errors[0];
            if (error.extensions.code === 'BAD_USER_INPUT') {
                const details = Array.isArray(error.extensions.exception.errors)
                    ? error.extensions.exception.errors.join('\n ')
                    : 'Error details not available';
                alert(`${error.message}:\n ${details}`);
            } else {
                alert(`${error.extensions.code}: ${error.message}`);
            }
        }
        return result.data;
    } catch (e) {
        alert(`Error in sending data to server: ${e.message}`);
    }
}

// IssueFilter 组件
class IssueFilter extends React.Component {
    constructor() {
        super();
        this.state = {
            selectedStatus: 'All',
        };
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(value) {
        this.setState({ selectedStatus: value });
        this.props.onFilterChange(value); // 通知父组件状态变化
    }

    render() {
        return (
            <View style={styles.filterContainer}>
                <Text style={styles.filterLabel}>Filter by Status:</Text>
                <Picker
                    selectedValue={this.state.selectedStatus}
                    style={styles.picker}
                    onValueChange={this.handleChange}
                >
                    <Picker.Item label="All" value="All" />
                    <Picker.Item label="New" value="New" />
                    <Picker.Item label="Assigned" value="Assigned" />
                    <Picker.Item label="Fixed" value="Fixed" />
                    <Picker.Item label="Closed" value="Closed" />
                </Picker>
            </View>
        );
    }
}

// BlackList 组件
class BlackList extends React.Component {
    constructor() {
        super();
        this.state = {
            name: '',
        };
    }

    setName = (newName) => {
        this.setState({ name: newName });
    };

    handleSubmit = async () => {
        const query = `mutation blackListAdd($newName: String!) {
            addToBlacklist(nameInput: $newName)
        }`;
        const { name } = this.state;

        const data = await graphQLFetch(query, { newName: name });
        if (data) {
            alert("Name added to blacklist.");
        }
        this.setState({ name: '' });
    };

    render() {
        return (
            <View style={styles.container}>
                <TextInput
                    style={styles.input}
                    placeholder="Name to Blacklist"
                    value={this.state.name}
                    onChangeText={(text) => this.setName(text)}
                />
                <Button onPress={this.handleSubmit} title="Add to BlackList" />
            </View>
        );
    }
}

// 样式
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    container: {
        padding: 8,  // 缩小 padding，减少外部间距
    },
    input: {
        height: 44,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        marginBottom: 5,  // 缩小输入框的底部间距
        paddingHorizontal: 10,
    },
    buttonContainer: {
        marginBottom: 20,  // 缩小按钮的底部间距
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
        color: '#333333',
    },
    headerRow: {
        flexDirection: 'row',
        backgroundColor: '#537791',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#dddddd',
    },
    headerCell: {
        flex: 1,
        textAlign: 'center',
        fontWeight: 'bold',
        color: '#ffffff',
        fontSize: 14,
    },
    row: {
        flexDirection: 'row',
        paddingVertical: 8,  // 调整行的上下间距
        borderBottomWidth: 1,
        borderBottomColor: '#e6e6e6',
    },
    cell: {
        flex: 1,
        textAlign: 'center',
        fontSize: 12,
        color: '#333333',
    },
    filterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,  // 缩短与表格之间的距离
    },
    filterLabel: {
        fontSize: 18,
        marginRight: 5,  // 缩小筛选标签与选择框之间的间距
        color: '#333333',
    },
    picker: {
        height: 55,
        width: 180,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        backgroundColor: '#f9f9f9',
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginVertical: 5,  // 缩短上下空隙
    },
    pageButton: {
        marginHorizontal: 3,  // 缩小页码按钮之间的水平间距
    },
    pickerContainer: {
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        marginBottom: 5,  // 缩小底部间距
        backgroundColor: '#f9f9f9',
    },
});


// IssueRow 组件
function IssueRow({ issue }) {
    const rowData = [
        issue.id, // 使用 issue.id 保持原始 ID
        issue.status,
        issue.owner,
        issue.created.toDateString(),
        issue.effort,
        issue.due ? issue.due.toDateString() : '',
        issue.title,
    ];
    return (
        <View style={styles.row}>
            {rowData.map((data, index) => (
                <Text key={index} style={styles.cell}>{data}</Text>
            ))}
        </View>
    );
}

// IssueTable 组件
function IssueTable({ issues, currentPage, issuesPerPage }) {
    const tableHead = ['ID', 'Status', 'Owner', 'Created', 'Effort', 'Due', 'Title'];

    // 计算当前页的 issues，但不更改 ID
    const indexOfLastIssue = currentPage * issuesPerPage;
    const indexOfFirstIssue = indexOfLastIssue - issuesPerPage;
    const currentIssues = issues.slice(indexOfFirstIssue, indexOfLastIssue);

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                {tableHead.map((header, index) => (
                    <Text key={index} style={styles.headerCell}>{header}</Text>
                ))}
            </View>
            <View>
                {currentIssues.map(issue => (
                    <IssueRow key={issue.id} issue={issue} />
                ))}
            </View>
        </View>
    );
}


// Pagination 组件
function Pagination({ totalIssues, issuesPerPage, currentPage, onPageChange }) {
    const pageNumbers = [];
    const totalPages = Math.ceil(totalIssues / issuesPerPage);

    for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
    }

    return (
        <View style={styles.paginationContainer}>
            {pageNumbers.map(number => (
                <View key={number} style={styles.pageButton}>
                    <Button
                        title={`${number}`}
                        onPress={() => onPageChange(number)}
                        disabled={number === currentPage}
                    />
                </View>
            ))}
        </View>
    );
}

// IssueAdd 组件
class IssueAdd extends React.Component {
    constructor() {
        super();
        this.handleSubmit = this.handleSubmit.bind(this);
        this.state = {
            title: '',
            status: 'New',
            owner: '',
            effort: '',
            due: '', // 新增 due 状态
        };
    }

    handleChange = (name, value) => {
        this.setState({ [name]: value });
    };

    handleSubmit = () => {
        const { title, status, owner, effort, due } = this.state;

        // 将 `due` 转换为日期格式，如果为空字符串则设为 `undefined`
        const dueDate = due ? new Date(due) : undefined;

        const issue = {
            title,
            status,
            owner,
            effort: effort ? parseInt(effort, 10) : undefined,
            due: dueDate, // 包含 due 字段
        };

        // 调用父组件传入的 createIssue 方法
        this.props.createIssue(issue);

        // 清空输入框的内容
        this.setState({ title: '', status: 'New', owner: '', effort: '', due: '' });
    };

    render() {
        return (
            <View style={styles.container}>
                <TextInput
                    style={styles.input}
                    placeholder="Title"
                    value={this.state.title}
                    onChangeText={(text) => this.handleChange('title', text)}
                />
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={this.state.status}
                        style={styles.picker}
                        onValueChange={(value) => this.handleChange('status', value)}
                    >
                        <Picker.Item label="New" value="New" />
                        <Picker.Item label="Assigned" value="Assigned" />
                        <Picker.Item label="Fixed" value="Fixed" />
                        <Picker.Item label="Closed" value="Closed" />
                    </Picker>
                </View>
                <TextInput
                    style={styles.input}
                    placeholder="Owner"
                    value={this.state.owner}
                    onChangeText={(text) => this.handleChange('owner', text)}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Effort (numeric)"
                    value={this.state.effort}
                    keyboardType="numeric"
                    onChangeText={(text) => this.handleChange('effort', text)}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Due Date (YYYY-MM-DD or leave blank for undefined)"
                    value={this.state.due}
                    onChangeText={(text) => this.handleChange('due', text)}
                />
                <Button title="Add Issue" onPress={this.handleSubmit} />
            </View>
        );
    }
}

// IssueList 组件
export default class IssueList extends React.Component {
    constructor() {
        super();
        this.state = { 
            issues: [],
            filteredIssues: [],
            currentPage: 1,
            issuesPerPage: 2,
        };
    }

    componentDidMount() {
        this.loadData();
    }

    async loadData() {
        const query = `query {
            issueList {
                id title status owner
                created effort due
            }
        }`;

        const data = await graphQLFetch(query);
        if (data) {
            this.setState({ 
                issues: data.issueList, 
                filteredIssues: data.issueList,
                currentPage: 1, // 加载数据后重置当前页码
            });
        }
    }

    createIssue = async (issue) => {
        const query = `mutation issueAdd($issue: IssueInputs!) {
            issueAdd(issue: $issue) {
                id
            }
        }`;

        const data = await graphQLFetch(query, { issue });
        if (data) {
            this.loadData();
        }
    };

    handleFilterChange = (status) => {
        const { issues } = this.state;
        let filtered;
        if (status === 'All') {
            filtered = issues;
        } else {
            filtered = issues.filter(issue => issue.status === status);
        }
        this.setState({ 
            filteredIssues: filtered,
            currentPage: 1, // 过滤后重置当前页码
        });
    };

    handlePageChange = (pageNumber) => {
        this.setState({ currentPage: pageNumber });
    };
    
    render() {
        return (
            <>
                <IssueFilter onFilterChange={this.handleFilterChange} />
                <IssueTable 
                    issues={this.state.filteredIssues} 
                    currentPage={this.state.currentPage}
                    issuesPerPage={this.state.issuesPerPage}
                />
                <Pagination 
                    totalIssues={this.state.filteredIssues.length} 
                    issuesPerPage={this.state.issuesPerPage} 
                    currentPage={this.state.currentPage}
                    onPageChange={this.handlePageChange}
                />
                <IssueAdd createIssue={this.createIssue} />
                <BlackList />
            </>
        );
    }
}

