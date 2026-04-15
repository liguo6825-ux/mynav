<?php
/**
 * Medoo 数据库操作类 (轻量级 ORM)
 * 
 * @version 2.7.10
 * @author Cat Luo
 * @link https://medoo.in
 */

namespace Medoo;

use PDO;
use Exception;

class Medoo
{
    public $pdo;
    public $dsn;
    public $database_type;
    public $database_file;

    protected $table;
    protected $columns;
    protected $where;
    protected $order;
    protected $limit;
    protected $offset;

    public function __construct(array $options)
    {
        $this->database_type = strtolower($options['database_type']);
        $this->database_file = $options['database_file'] ?? null;

        if ($this->database_type === 'sqlite') {
            $this->dsn = "sqlite:{$this->database_file}";
        } else {
            throw new Exception("Unsupported database type: {$this->database_type}");
        }

        $this->pdo = new PDO($this->dsn);
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, $options['error'] ?? PDO::ERRMODE_EXCEPTION);
        $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    }

    public function select($table, $columns = '*', $where = null)
    {
        $this->table = $table;
        $this->columns = $columns;
        $this->where = $where;

        $sql = $this->buildSelectQuery();
        $params = $this->buildWhereParams($where);

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll();
    }

    public function get($table, $columns = '*', $where = null)
    {
        $results = $this->select($table, $columns, $where);
        return $results ? $results[0] : null;
    }

    public function insert($table, $data)
    {
        $fields = array_keys($data);
        $placeholders = array_fill(0, count($fields), '?');

        $sql = "INSERT INTO {$table} (" . implode(', ', $fields) . ") 
                VALUES (" . implode(', ', $placeholders) . ")";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(array_values($data));

        return $this->pdo->lastInsertId();
    }

    public function update($table, $data, $where = null)
    {
        $fields = array_map(function ($key) {
            return "{$key} = ?";
        }, array_keys($data));

        $sql = "UPDATE {$table} SET " . implode(', ', $fields);
        $params = array_values($data);

        if ($where) {
            $sql .= " WHERE " . $this->buildWhereClause($where);
            $params = array_merge($params, $this->buildWhereParams($where));
        }

        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete($table, $where = null)
    {
        $sql = "DELETE FROM {$table}";
        $params = [];

        if ($where) {
            $sql .= " WHERE " . $this->buildWhereClause($where);
            $params = $this->buildWhereParams($where);
        }

        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($params);
    }

    public function count($table, $where = null)
    {
        $sql = "SELECT COUNT(*) FROM {$table}";
        $params = [];

        if ($where) {
            $sql .= " WHERE " . $this->buildWhereClause($where);
            $params = $this->buildWhereParams($where);
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        return (int) $stmt->fetchColumn();
    }

    public function has($table, $where = null)
    {
        return $this->count($table, $where) > 0;
    }

    public function query($sql, $params = [])
    {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function exec($sql)
    {
        return $this->pdo->exec($sql);
    }

    public function lastInsertId()
    {
        return $this->pdo->lastInsertId();
    }

    protected function buildSelectQuery()
    {
        $sql = "SELECT ";

        if (is_array($this->columns)) {
            $sql .= implode(', ', $this->columns);
        } else {
            $sql .= $this->columns;
        }

        $sql .= " FROM {$this->table}";

        if ($this->where) {
            $sql .= " WHERE " . $this->buildWhereClause($this->where);
        }

        if (isset($this->where['ORDER'])) {
            $order = $this->where['ORDER'];
            $parts = [];
            foreach ($order as $column => $direction) {
                $parts[] = "{$column} {$direction}";
            }
            $sql .= " ORDER BY " . implode(', ', $parts);
        }

        if (isset($this->where['LIMIT'])) {
            $sql .= " LIMIT " . (int) $this->where['LIMIT'];
        }

        return $sql;
    }

    protected function buildWhereClause($where)
    {
        if (!$where) return '';

        $clauses = [];
        foreach ($where as $key => $value) {
            if (in_array($key, ['ORDER', 'LIMIT', 'AND', 'OR'])) {
                continue;
            }
            if (is_array($value)) {
                $clauses[] = "{$key} IN (" . implode(',', array_fill(0, count($value), '?')) . ")";
            } else {
                $clauses[] = "{$key} = ?";
            }
        }

        return implode(' AND ', $clauses);
    }

    protected function buildWhereParams($where)
    {
        if (!$where) return [];

        $params = [];
        foreach ($where as $key => $value) {
            if (in_array($key, ['ORDER', 'LIMIT', 'AND', 'OR'])) {
                continue;
            }
            if (is_array($value)) {
                $params = array_merge($params, $value);
            } else {
                $params[] = $value;
            }
        }

        return $params;
    }

    public function __debugInfo()
    {
        return [
            'database_type' => $this->database_type,
            'database_file' => $this->database_file,
            'dsn' => $this->dsn
        ];
    }
}
