import plotly.graph_objs as go
import pandas as pd
from typing import List, Dict, Optional, Union

class MortgageCalculator:
    """
    A class to calculate mortgage scenarios for a given interest rate, monthly payment, and initial payment.
    Provides methods to calculate overpayment, total cost, and display results as a Plotly table or graph.
    """
    def __init__(self, interest_rate: float, monthly_payment: float, initial_payment: float, min_initial_payment_percentage: float = 20):
        """
        Initialize the MortgageCalculator.
        :param interest_rate: Annual interest rate as a percentage (e.g., 7 for 7%)
        :param monthly_payment: Desired monthly payment amount
        :param initial_payment: Initial payment amount
        :param min_initial_payment_percentage: Minimum initial payment as a percentage of property value (default: 20)
        """
        self.interest_rate = interest_rate / 100  # Convert to decimal
        self.monthly_payment = monthly_payment
        self.initial_payment = initial_payment
        self.min_initial_payment_percentage = min_initial_payment_percentage / 100  # Convert to decimal
        self.results: List[Dict] = []

    def generate_years_range(self, min_years: int, max_years: int, step: Optional[int] = None) -> List[int]:
        """
        Генерирует массив лет с учетом диапазона:
        - Если step задан, всегда шаг step
        - Если step не задан: старое поведение (авто-режим)
        """
        if step is not None and step > 0:
            return list(range(min_years, max_years + 1, step))
        range_years = max_years - min_years
        step_auto = 1
        if range_years > 13:
            step_auto = 3
        elif range_years > 7:
            step_auto = 2
        years = []
        for year in range(min_years, max_years + 1, step_auto):
            years.append(year)
        if years and years[-1] < max_years:
            years.append(years[-1] + step_auto)
        return years

    def calculate(self, min_years: int = 1, max_years: int = 30, step: Optional[int] = None) -> None:
        """
        Для каждого количества лет в диапазоне рассчитывает:
        - Максимальную сумму кредита (principal)
        - Стоимость недвижимости (principal + первоначальный взнос)
        - Общую сумму выплат (первоначальный взнос + все ежемесячные платежи)
        - Переплату (общая сумма выплат - стоимость недвижимости)
        - Процент переплаты (переплата / principal)
        Сохраняет результаты для каждого срока.
        :param min_years: Минимальный срок ипотеки (лет)
        :param max_years: Максимальный срок ипотеки (лет)
        :param step: Шаг по годам (если None — авто-режим)
        """
        self.results = []
        r = self.interest_rate / 12
        years_range = self.generate_years_range(min_years, max_years, step)
        for years in years_range:
            n = years * 12
            if r == 0:
                principal = self.monthly_payment * n
            else:
                principal = self.monthly_payment * (1 - (1 + r) ** -n) / r
            actual_initial_payment = self.initial_payment
            property_value = principal + actual_initial_payment
            total_payment = actual_initial_payment + self.monthly_payment * n
            overpayment = total_payment - property_value
            overpayment_percentage = overpayment / principal if principal != 0 else 0
            self.results.append({
                'years': years,
                'principal': round(principal),
                'initial_payment': round(actual_initial_payment),
                'property_value': round(property_value),
                'monthly_payment': round(self.monthly_payment),
                'total_payment': round(total_payment),
                'overpayment': round(overpayment),
                'overpayment_percentage': overpayment_percentage,
                'min_initial_payment_percentage': self.min_initial_payment_percentage * 100
            })

    def optimize(self) -> Optional[Dict]:
        """
        Return the scenario with the minimum overpayment.
        :return: Dictionary with the optimal scenario or None if no results
        """
        if not self.results:
            return None
        return min(self.results, key=lambda x: x['overpayment'])

    def _format_table(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Форматирует DataFrame для отображения: добавляет разделители тысяч (пробел), 'руб.' для денежных столбцов и проценты для переплаты.
        """
        for col in ['principal', 'initial_payment', 'property_value', 'monthly_payment', 'total_payment', 'overpayment']:
            df[col] = df[col].apply(lambda x: f"{x:,.0f}".replace(",", " ") + " руб.")
        df['overpayment_percentage'] = df['overpayment_percentage'].apply(lambda x: f"{x:.2%}")
        return df

    def print_table(self, return_html: bool = False) -> None:
        """
        Отобразить результаты в виде красивой таблицы Plotly на русском языке.
        Если return_html=True, вернуть HTML-строку для вставки в Flask.
        """
        if not self.results:
            if return_html:
                return '<div style="color:red;">Нет данных для отображения. Сначала выполните расчет (calculate()).</div>'
            print("Нет данных для отображения. Сначала выполните расчет (calculate()).")
            return
        import pandas as pd
        df = pd.DataFrame(self.results)
        df = self._format_table(df)
        columns_map = {
            'years': 'Срок (лет)',
            'principal': 'Сумма кредита',
            'initial_payment': 'Первоначальный взнос',
            'property_value': 'Стоимость недвижимости',
            'monthly_payment': 'Ежемесячный платеж',
            'total_payment': 'Общая выплата',
            'overpayment': 'Переплата',
            'overpayment_percentage': 'Процент переплаты',
        }
        header = dict(
            values=[columns_map[col] for col in df.columns],
            fill_color=[["#3a6073", "#3a7bd5"]*int(len(df.columns)/2+1)][:len(df.columns)],
            font=dict(color='white', size=12, family='Arial, sans-serif'),
            align=['center']*len(df.columns),
            height=72
        )
        fill_colors = []
        for i in range(len(df)):
            fill_colors.append('#FFFFFF' if i % 2 == 0 else '#F4F9F4')
        cells = dict(
            values=[df[col] for col in df.columns],
            fill_color=[fill_colors]*len(df.columns),
            align=['center']*len(df.columns),
            font=dict(color='#444', size=12, family='Arial, sans-serif'),
            height=27,
            format=[None]*len(df.columns),
            suffix=[None]*len(df.columns),
        )
        import plotly.graph_objs as go
        fig = go.Figure(data=[go.Table(header=header, cells=cells)])
        fig.update_layout(
            title={
                'text': 'Результаты расчета ипотеки',
                'x': 0.5,
                'xanchor': 'center',
                'font': dict(size=28, family='Arial, sans-serif', color='#264653', weight='bold'),
                'yanchor': 'top',
            },
            margin=dict(l=20, r=20, t=80, b=20),
            paper_bgcolor='#FFFFFF',
            autosize=True,
            width=None,
            height=None,
        )
        fig_html = fig.to_html(full_html=False, include_plotlyjs='cdn')
        custom_css = '''
        <style>
        .js-plotly-plot .plotly table {
            border-radius: 18px !important;
            box-shadow: 0 4px 24px 0 rgba(60,60,60,0.10), 0 1.5px 6px 0 rgba(60,60,60,0.08);
            overflow: hidden;
        }
        .js-plotly-plot .plotly table th {
            padding: 14px 8px !important;
        }
        .js-plotly-plot .plotly table td {
            padding: 12px 8px !important;
            transition: background 0.2s;
        }
        .js-plotly-plot .plotly table tr:hover td {
            background: #e0f7fa !important;
        }
        </style>
        '''
        if return_html:
            return custom_css + fig_html
        else:
            from IPython.display import display, HTML
            display(HTML(custom_css + fig_html))

    def plot_graph(self, return_html: bool = False) -> Optional[str]:
        """
        Построить составную столбчатую диаграмму для каждого срока, показывающую сумму кредита, первоначальный взнос и переплату в составе общей выплаты.
        Добавить процентные подписи для каждого компонента, аннотацию общей выплаты вверху каждого столбца,
        а также сбоку S-образную фигурную скобку и подпись стоимости недвижимости (сумма кредита + первоначальный взнос).
        Если return_html=True, вернуть HTML-код графика для вставки во Flask.
        """
        if not self.results:
            if return_html:
                return '<div style="color:red;">Нет данных для построения графика. Сначала выполните расчет (calculate()).</div>'
            print("Нет данных для построения графика. Сначала выполните расчет (calculate()).")
            return
        import pandas as pd
        import plotly.graph_objs as go
        df = pd.DataFrame(self.results)
        years = df['years']
        principal = df['principal'].astype(float)
        initial_payment = df['initial_payment'].astype(float)
        overpayment = df['overpayment'].astype(float)
        total_payment = df['total_payment'].astype(float)
        property_value = df['property_value'].astype(float)

        # Проценты для каждого компонента
        principal_pct = principal / total_payment
        initial_payment_pct = initial_payment / total_payment
        overpayment_pct = overpayment / total_payment

        # Цвета
        colors = {
            'principal': '#264653',        # синий/темный
            'initial_payment': '#00CC96',  # зеленый
            'overpayment': '#EF553B'       # красный
        }

        bar_width = 0.4
        fig = go.Figure()
        fig.add_trace(go.Bar(
            y=years, x=principal, name='Сумма кредита', marker_color=colors['principal'],
            width=[bar_width]*len(years),
            text=[f"{p:.0%}" for p in principal_pct], textposition='inside',
            insidetextanchor='middle',
            orientation='h',
            hovertemplate='Сумма кредита: %{x:,.0f} руб.<br>Срок: %{y} лет<extra></extra>',
            textfont=dict(size=10)
        ))
        fig.add_trace(go.Bar(
            y=years, x=initial_payment, name='Первоначальный взнос', marker_color=colors['initial_payment'],
            width=[bar_width]*len(years),
            text=[f"{p:.0%}" for p in initial_payment_pct], textposition='inside',
            insidetextanchor='middle',
            orientation='h',
            hovertemplate='Первоначальный взнос: %{x:,.0f} руб.<br>Срок: %{y} лет<extra></extra>',
            textfont=dict(size=10)
        ))
        fig.add_trace(go.Bar(
            y=years, x=overpayment, name='Переплата', marker_color=colors['overpayment'],
            width=[bar_width]*len(years),
            text=[f"{p:.0%}" for p in overpayment_pct], textposition='inside',
            insidetextanchor='middle',
            orientation='h',
            hovertemplate='Переплата: %{x:,.0f} руб.<br>Срок: %{y} лет<extra></extra>',
            textfont=dict(size=10)
        ))

        # Аннотация для общей выплаты справа от каждого бара
        for i, year in enumerate(years):
            total_mln = total_payment.iloc[i] / 1_000_000
            if total_mln.is_integer():
                total_str = f"{int(total_mln)} млн руб."
            else:
                total_str = f"{total_mln:.1f} млн руб."
            annotation_text = f"<span style='color:#264653;font-size:10px;font-family:Arial,sans-serif'>Общая выплата</span><br><span style='color:#444;font-size:10px;font-family:Arial,sans-serif'>{total_str}</span>"
            fig.add_annotation(
                x=total_payment.iloc[i],
                y=year,
                text=annotation_text,
                showarrow=False,
                xshift=12,
                font=dict(size=10, color="#444", family="Arial, sans-serif"),
                bgcolor="rgba(255,255,255,0.7)",
                bordercolor="#cccccc",
                borderwidth=1,
                borderpad=4,
                opacity=0.95,
                textangle=0,
                xanchor="left",
                yanchor="middle"
            )

        # S-образная фигурная скобка и подпись стоимости недвижимости сверху от бара
        for i, year in enumerate(years):
            x0 = initial_payment.iloc[i]
            x1 = initial_payment.iloc[i] + principal.iloc[i]
            y_pos = year
            # Скобка вплотную к бару
            y_bracket = y_pos - bar_width/2
            x_bracket_right = x1
            x_bracket_left = 0
            bracket_path = (
                f"M{x_bracket_left},{y_bracket} "
                f"C{x_bracket_left+0.18*(x_bracket_right-x_bracket_left)},{y_bracket-0.10} "
                f"{x_bracket_right-0.18*(x_bracket_right-x_bracket_left)},{y_bracket-0.10} "
                f"{x_bracket_right},{y_bracket}"
            )
            fig.add_shape(
                type="path",
                path=bracket_path,
                line=dict(color="#222", width=1),
                xref="x", yref="y"
            )
            # Подпись "Стоимость недвижимости" над скобкой, жирным только число
            prop_mln = property_value.iloc[i] / 1_000_000
            if prop_mln.is_integer():
                prop_num = f"{int(prop_mln)}"
                prop_str = f"{int(prop_mln)} млн руб."
            else:
                prop_num = f"{prop_mln:.1f}"
                prop_str = f"{prop_mln:.1f} млн руб."
            annotation_text = f"<span style='color:#264653;font-size:11px;font-family:Arial,sans-serif'>Стоимость недвижимости: <b style='color:#222'>{prop_num}</b> млн руб.</span>"
            fig.add_annotation(
                x=(x_bracket_left+x_bracket_right)/2,
                y=y_bracket-0.18,  # чуть выше скобки
                text=annotation_text,
                showarrow=False,
                font=dict(size=11, color="#264653", family="Arial, sans-serif"),
                align="center",
                bgcolor="rgba(255,255,255,0)",
                bordercolor="rgba(0,0,0,0)",
                borderwidth=0,
                borderpad=2,
                opacity=1,
                textangle=0,
                xanchor="center",
                yanchor="bottom"
            )

        # Адаптивная высота и уменьшенная ширина графика
        min_height = 350
        px_per_year = 80
        height = max(min_height, px_per_year * len(years))

        fig.update_layout(
            barmode='stack',
            title={
                'text': 'Структура выплаты',
                'x': 0.5,
                'xanchor': 'center',
                'font': dict(size=28, family='Arial, sans-serif', color='#264653', weight='bold'),
                'yanchor': 'top',
            },
            xaxis_title='Сумма (руб.)',
            yaxis_title='Срок (лет)',
            font=dict(family='Arial, sans-serif', size=13, color='#444'),
            plot_bgcolor='#FFFFFF',
            paper_bgcolor='#FFFFFF',
            xaxis=dict(showgrid=False, zeroline=False,
                       title_font=dict(size=11, family='Arial, sans-serif', color='#222'),
                       tickfont=dict(size=11, family='Arial, sans-serif', color='#444')),
            yaxis=dict(showgrid=False, zeroline=False, tickmode='linear', range=[min(years)-0.7, max(years)+0.7],
                       title_font=dict(size=11, family='Arial, sans-serif', color='#222'),
                       tickfont=dict(size=11, family='Arial, sans-serif', color='#444'),
                       autorange='reversed',
                       ticklabelposition='outside'),
            legend=dict(
                orientation='h',
                yanchor='bottom',
                y=1.02,
                xanchor='center',
                x=0.5,
                bgcolor='rgba(0,0,0,0)',
                font=dict(size=13)
            ),
            margin=dict(l=120, r=40, t=170, b=40),
            height=height
        )
        if return_html:
            html = fig.to_html(full_html=False, include_plotlyjs='cdn')
            return f"<div style='width:50vw;min-width:320px;max-width:100vw;margin:0 auto'>{html}</div>"
        else:
            fig.show()
            return None 